import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.DEMO_URL || 'http://127.0.0.1:4321';
const browser = await puppeteer.connect({ browserURL: process.env.CDP_URL || 'http://127.0.0.1:9222' });
const results = [];
const record = (name, details = {}) => { results.push({ name, passed: true, ...details }); console.log(`PASS ${name}`); };

async function freshPage(width = 1440, height = 800, javaScript = true) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.setJavaScriptEnabled(javaScript);
  if (javaScript) await page.evaluateOnNewDocument(() => localStorage.clear());
  return page;
}

try {
  {
    const page = await freshPage(320, 800);
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="mode-selector"]');
    const state = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.mode-card')];
      const rects = cards.map(card => { const r = card.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
      return {
        cards: cards.map(card => card.textContent.trim()),
        fullProfile: Boolean(document.querySelector('a[href="/profile"]')),
        overflow: document.documentElement.scrollWidth > innerWidth,
        stacked: rects.length === 2 && rects[1].top >= rects[0].bottom,
      };
    });
    assert.equal(state.cards.length, 2);
    assert.ok(state.cards[0].includes('Visual interface'));
    assert.ok(state.cards[1].includes('Agent CLI'));
    assert.equal(state.fullProfile, true);
    assert.equal(state.overflow, false);
    assert.equal(state.stacked, true);
    record('first visit offers all three paths and stacks cards at 320px', state);

    await page.click('.mode-card-visual');
    await page.waitForSelector('[data-testid="visual-mode"]');
    assert.equal(await page.evaluate(() => localStorage.getItem('portfolio-mode')), 'visual');
    await page.type('#portfolio-prompt', '/experience');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('[role="log"]')?.textContent?.includes('No model call used'));
    const visualText = await page.$eval('[role="log"]', element => element.textContent);
    assert.ok(visualText.includes('Amazon'));
    assert.ok(visualText.includes('Intuit'));
    record('Visual mode stores preference and runs deterministic experience lookup');

    await page.click('button[aria-label="CLI mode"]');
    await page.waitForSelector('[data-testid="cli-mode"]');
    assert.ok((await page.$eval('[role="log"]', element => element.textContent)).includes('Amazon'));
    record('switching Visual to CLI preserves the transcript');

    const editor = await page.$('#portfolio-prompt');
    await editor.focus();
    await page.type('#portfolio-prompt', '/exp');
    await page.keyboard.press('Tab');
    assert.equal(await page.$eval('#portfolio-prompt', element => element.value), '/experience');
    record('CLI Tab completion expands /exp');

    await page.keyboard.down('Control'); await page.keyboard.press('KeyL'); await page.keyboard.up('Control');
    await page.waitForFunction(() => !document.querySelector('[role="log"]')?.textContent?.includes('No model call used'));
    assert.ok((await page.$eval('[role="log"]', element => element.textContent)).includes("I'm Chintan's portfolio assistant"));
    record('CLI Ctrl+L clears transcript while retaining welcome content');
    await page.close();
  }

  {
    const page = await freshPage(768, 800);
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!request.url().endsWith('/api/chat')) return request.continue();
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      const body = [
        'event: meta\ndata: {"model":"e2e-free-model"}\n\n',
        'event: tool\ndata: {"status":"complete","label":"Approved sources selected"}\n\n',
        'event: delta\ndata: {"text":"Chintan builds distributed systems at Amazon."}\n\n',
        'event: sources\ndata: {"sources":[{"id":"experience-amazon"}]}\n\n',
        'event: done\ndata: {"fallback":false}\n\n',
      ].join('');
      return request.respond({ status: 200, headers: { ...headers, 'Content-Type': 'text/event-stream' }, body });
    });
    await page.goto(`${base}/?mode=visual`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#portfolio-prompt');
    await page.type('#portfolio-prompt', 'What has Chintan built at Amazon?');
    await page.click('[aria-label="Send message"]');
    await page.waitForFunction(() => document.querySelector('[role="log"]')?.textContent?.includes('Chintan builds distributed systems at Amazon.'));
    const state = await page.evaluate(() => ({
      text: document.querySelector('[role="log"]')?.textContent,
      busy: document.querySelector('#portfolio-prompt')?.getAttribute('aria-busy'),
      sourceLinks: document.querySelectorAll('[role="log"] a').length,
    }));
    assert.equal(state.busy, 'false');
    assert.ok(state.sourceLinks > 0);
    record('natural-language streamed answer renders validated source links', { sourceLinks: state.sourceLinks });
    await page.close();
  }

  {
    const page = await freshPage(320, 600);
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!request.url().endsWith('/api/chat')) return request.continue();
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } });
      // Keep the request pending so Escape cancellation can be tested before response headers arrive.
    });
    await page.goto(`${base}/?mode=cli`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#portfolio-prompt');
    await page.type('#portfolio-prompt', 'Tell me about Kafka');
    await page.click('[aria-label="Send message"]');
    await page.waitForSelector('[aria-label="Stop generating"]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[aria-label="Send message"]');
    assert.ok((await page.$eval('[role="log"]', element => element.textContent)).includes('Generation stopped'));
    record('Escape cancels a pending response and restores the composer');
    await page.close();
  }

  for (const [width, height] of [[320, 360], [320, 800], [768, 800], [1440, 900]]) {
    for (const mode of ['visual', 'cli']) {
      const page = await freshPage(width, height);
      await page.goto(`${base}/?mode=${mode}`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('#portfolio-prompt');
      const layout = await page.evaluate(() => {
        const composer = document.querySelector('.composer').getBoundingClientRect();
        const transcript = document.querySelector('[role="log"]').getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          composerVisible: composer.top >= 0 && composer.bottom <= innerHeight + 1,
          overlap: transcript.bottom > composer.top + 1,
        };
      });
      assert.deepEqual(layout, { overflow: false, composerVisible: true, overlap: false });
      record(`${mode} layout at ${width}x${height}`, layout);
      await page.close();
    }
  }

  {
    const page = await freshPage(320, 800, false);
    await page.goto(`${base}/`, { waitUntil: 'load' });
    const links = await page.$$eval('a', elements => elements.filter(element => element.getClientRects().length).map(element => element.getAttribute('href')));
    assert.ok(links.includes('/profile'));
    assert.ok(links.includes('/projects'));
    assert.ok(links.includes('/writing'));
    assert.ok(links.includes('/contact'));
    record('no-JavaScript homepage exposes static navigation');
    await page.close();
  }
} catch (error) {
  results.push({ name: 'run', passed: false, error: error.stack || String(error) });
  throw error;
} finally {
  await mkdir('.dev/audit', { recursive: true });
  await writeFile('.dev/audit/e2e-spec.json', JSON.stringify(results, null, 2));
  await browser.disconnect();
}
