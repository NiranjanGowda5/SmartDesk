import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const origin=process.env.SMARTDESK_ORIGIN || 'http://127.0.0.1:5173';
const folder=new URL('../../docs/screenshots/',import.meta.url);
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
const errors=[];
try {
 for(const role of ['employee','admin','engineer']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const snap=async(name,element=page)=>{
   await page.locator('.toast').waitFor({state:'hidden'});
   await page.evaluate(()=>document.fonts.ready);
   await element.screenshot({path:fileURLToPath(new URL(name+'.png',folder)),animations:'disabled'});
  };
  await page.goto(origin+'/register');
  await page.getByLabel('Full name').waitFor();
  await page.getByRole('link',{name:'Sign in'}).click();
  await page.getByRole('heading',{name:'Welcome back'}).waitFor();
  if(role==='employee') await snap('login');
  await page.getByLabel('Email address').fill(role+'@smartdesk.test');
  await page.getByLabel('Password',{exact:true}).fill(process.env.DEMO_PASSWORD);
  await page.getByRole('button',{name:'Sign in'}).click();
  await page.getByRole('heading',{name:'Workspace overview'}).waitFor();
  await page.locator('.recharts-bar-rectangle').first().waitFor();
  await page.waitForTimeout(1600);
  await snap(role+'-dashboard');
  if(role==='admin'){
   await snap('analytics',page.locator('.charts'));
   await page.getByRole('button',{name:'Switch to dark mode'}).click();
   await snap('dark-mode');
   await page.getByRole('button',{name:'Switch to light mode'}).click();
   await page.getByRole('link',{name:'Administration'}).click();
   await page.getByRole('heading',{name:'User directory'}).waitFor();
   const download=page.waitForEvent('download');
   await page.getByRole('button',{name:'Export CSV'}).click();
   assert.equal((await download).suggestedFilename(),'smartdesk-tickets.csv');
  }
  await page.getByRole('link',{name:'Ticket queue'}).click();
  await page.locator('tbody tr').first().waitFor();
  if(role==='admin') await snap('ticket-management');
  const search=page.getByRole('searchbox');
  await search.fill('no matching request 059934');
  await page.getByText('No tickets match these filters.').waitFor();
  await search.fill('');
  await page.locator('[aria-label="Filter by status"]').selectOption('OPEN');
  await page.locator('[aria-label="Filter by status"]').selectOption('');
  if(role==='employee'){
   await page.getByRole('button',{name:'New ticket'}).click();
   await page.getByLabel('Subject',{exact:true}).fill('Conference room display disconnects');
   await page.getByLabel('Description',{exact:true}).fill('The meeting room display loses signal when a laptop reconnects to the dock.');
   await page.locator('[name=categoryId]').selectOption({label:'Hardware'});
   await page.locator('[name=priorityId]').selectOption({label:'Medium'});
   await snap('ticket-creation');
   await page.getByRole('button',{name:'Cancel'}).click();
  }
  await page.locator('tbody a').first().click();
  await page.getByRole('heading',{name:'Conversation'}).waitFor();
  if(role==='admin'){
   // Exercise a multi-page queue independently of the size of the local demo database.
   await page.route('**/api/tickets',async route=>{
    const response=await route.fetch();
    const rows=await response.json();
    const fixture=Array.from({length:13},(_,index)=>({...rows[0],id:1000+index,title:'Pagination fixture '+index}));
    await route.fulfill({response,json:fixture});
   });
   await page.goto(origin+'/tickets');
   await page.getByText(/Page 1 of 2/).waitFor();
   await page.getByRole('button',{name:'Next page'}).click();
   await page.getByText(/Page 2 of 2/).waitFor();
   assert.equal(await page.locator('tbody tr').count(),3);
   await page.getByRole('button',{name:'Previous page'}).click();
   assert.equal(await page.locator('tbody tr').count(),10);
  }
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Ticket detail mobile width');
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log('Eight portfolio screenshots captured. Registration, login, role dashboards, admin export, filtered queues, creation and ticket detail rendered.');
}finally{await browser.close();}
