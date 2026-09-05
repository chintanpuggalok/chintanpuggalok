import puppeteer from 'puppeteer-core';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
const require=createRequire(import.meta.url), report={browser:[],code:[]};
async function load(path){const result=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const scope=await load('shared/scope.ts');
for(const question of ['Write a Python ransomware program','What is his favorite pizza?','Tell me about Redis','Tell me about Docker']) report.code.push({test:'scope',question,accepted:scope.isPortfolioQuestion(question)});
const {readSSE}=await load('shared/stream.ts');
for(const data of ['data: '+ 'x'.repeat(70000)+'\n\n',Array(100).fill('data: '+'x'.repeat(1000)+'\n').join('')+'\n']){
 let size=0,error=null;try{for await(const event of readSSE(new Response(data).body))size+=event.data.length;}catch(e){error=e.message;}
 report.code.push({test:'SSE 64KB limit',inputBytes:data.length,acceptedDataLength:size,error});
}
const {providerEvents}=await load('worker/src/provider.ts');
const originalFetch=globalThis.fetch;
for(const text of ['Invented achievement with no citation.','SOURCES_JSON:{"sourceIds":[]}', 'a'.repeat(15)+'1234567890'+'b'.repeat(75)]){
 globalThis.fetch=async()=>new Response('data: '+JSON.stringify({choices:[{delta:{content:text}}]})+'\n\ndata: [DONE]\n\n');
 const events=[];for await(const event of providerEvents({OPENROUTER_API_KEY:'dummy',OPENROUTER_MODEL:'test:free'},'Amazon work',[],[],new AbortController().signal))events.push(event);
 report.code.push({test:'provider response validation',providerText:text,events});
}
globalThis.fetch=originalFetch;
const browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9222'});
try{
 for(const theme of ['dark','light'])for(const [width,height] of [[320,360],[320,800],[1440,800]])for(const mode of ['visual','cli']){
  const page=await browser.newPage();await page.setViewport({width,height});
  await page.evaluateOnNewDocument(t=>localStorage.setItem('portfolio-theme',t),theme);
  await page.goto('http://127.0.0.1:4321/ask?mode='+mode,{waitUntil:'domcontentloaded'});await page.waitForSelector('#portfolio-prompt');
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const result=await page.evaluate(async()=>{
   const c=document.querySelector('.composer').getBoundingClientRect(),t=document.querySelector('[role=log]').getBoundingClientRect();
   const a=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});
   return {overflow:document.documentElement.scrollWidth>innerWidth,composer:{top:c.top,bottom:c.bottom},transcript:{height:t.height,bottom:t.bottom},violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};
  });
  report.browser.push({theme,width,height,mode,...result});console.log(theme,width,height,mode,JSON.stringify(result));await page.close();
 }
 const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.setViewport({width:320,height:800});await page.goto('http://127.0.0.1:4321/profile/');
 report.browser.push({test:'no-JS mobile navigation',links:await page.$$eval('#site-navigation a',els=>els.map(e=>({text:e.textContent,visible:e.getClientRects().length>0}))) });await page.close();
}finally{await browser.disconnect();await writeFile('.dev/audit/edge-cases.json',JSON.stringify(report,null,2));}
