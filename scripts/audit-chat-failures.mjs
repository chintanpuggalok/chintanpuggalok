import puppeteer from 'puppeteer-core';
import {writeFile} from 'node:fs/promises';
const browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9222'}),report=[];
try {
 for(const scenario of ['rate-limit','interrupted']){
  const page=await browser.newPage();await page.setRequestInterception(true);
  let calls=0;
  page.on('request',async req=>{
   if(!req.url().endsWith('/api/chat'))return req.continue();
   const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
   if(req.method()==='OPTIONS')return req.respond({status:204,headers});
   calls++;
   if(scenario==='rate-limit')return req.respond({status:429,headers:{...headers,'Retry-After':'60'},body:'{}'});
   return req.respond({status:200,headers:{...headers,'Content-Type':'text/event-stream'},body:'event: delta\ndata: {"text":"Partial AI answer preserved."}\n\n'});
  });
  await page.goto('http://127.0.0.1:4321/?mode=cli');await page.waitForSelector('#portfolio-prompt');await page.type('#portfolio-prompt','What systems has Chintan built?');await page.click('[aria-label="Send message"]');
  await page.waitForSelector('.retry-button');
  const state=await page.evaluate(()=>{const retry=document.querySelector('.retry-button');return {log:document.querySelector('[role=log]').textContent,model:document.querySelector('.cli-model-label').textContent,retryLabel:retry.textContent,retryDisabled:retry.disabled};});
  if(scenario==='rate-limit'&&(!state.retryDisabled||!state.retryLabel.startsWith('Retry in ')))throw new Error('Rate-limit retry cooldown was not enforced');
  if(scenario==='interrupted'&&(state.retryDisabled||state.retryLabel!=='Retry question'))throw new Error('Interrupted response was not immediately retryable');
  report.push({scenario,...state,networkCalls:calls});await page.close();
 }
}finally{await browser.disconnect();await writeFile('.dev/audit/chat-failures.json',JSON.stringify(report,null,2));}
