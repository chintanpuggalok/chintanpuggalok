import puppeteer from 'puppeteer-core';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const browser = await puppeteer.connect({browserURL: process.env.CDP_URL || 'http://127.0.0.1:9222'});
const base = process.env.DEMO_URL || 'http://127.0.0.1:4321';
const dir = '.dev/audit';
await mkdir(dir, { recursive: true });
const report = [];
try {
  for (const width of [320, 768, 1440]) {
    for (const path of ['/ask?mode=visual', '/ask?mode=cli', '/', '/profile/', '/contact/', '/projects/ticketing-analysis-agent/', '/writing/url-forwarding/', '/resume/']) {
      const page = await browser.newPage();
      await page.setViewport({width, height: 800});
      const errors=[];page.on('pageerror', e=>errors.push(e.message));
      await page.goto(base + path, {waitUntil:'networkidle2'});
      if (path.startsWith('/ask?')) await page.waitForSelector('#portfolio-prompt');
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const result=await page.evaluate(async()=>{
        const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
        const audit=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});
        return {overflow:document.documentElement.scrollWidth>innerWidth,bodyHeight:document.body.scrollHeight,viewport:[innerWidth,innerHeight],composer:document.querySelector('.composer')?rect(document.querySelector('.composer')):null,violations:audit.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.slice(0,8).map(n=>({target:n.target,summary:n.failureSummary}))}))};
      });
      report.push({width,path,...result,errors});
      console.log(width,path,JSON.stringify({overflow:result.overflow,violations:result.violations.map(v=>v.id),errors}));
      if (path.startsWith('/ask?')) {
        await page.type('#portfolio-prompt','/experience');await page.keyboard.press('Enter');
        await page.waitForFunction(()=>document.body.textContent.includes('No model call used'));
        const layout=await page.evaluate(()=>{const c=document.querySelector('.composer').getBoundingClientRect();const t=document.querySelector('[role=log]').getBoundingClientRect();return {composerBottom:c.bottom,composerHeight:c.height,transcriptBottom:t.bottom,overlap:t.bottom>c.top+1,viewport:innerHeight}});
        report.push({width,path,afterMessage:layout});console.log('after-message',layout);
      }
      if(width===320||width===1440) await page.screenshot({path:`${dir}/${width}-${path.replace(/[^a-z0-9]/gi,'_')}.png`,fullPage:true});
      await page.close();
    }
  }
} finally {await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));await browser.disconnect();}
