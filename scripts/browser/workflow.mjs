import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error('Load the project environment before running this check.');
const origin = process.env.SMARTDESK_ORIGIN || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'msedge',
  headless: true,
});

try {
  const pages = {};
  for (const [account, role] of [['employee','EMPLOYEE'], ['engineer','ENGINEER'], ['admin','ADMIN']]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.locator('input[type=email]').fill(account + '@smartdesk.test');
    await page.locator('input[type=password]').fill(password);
    const login = page.waitForResponse(r => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST');
    await page.locator('button[type=submit]').click();
    const response = await login;
    assert.equal(response.status(), 200);
    const {token, user} = await response.json();
    assert.equal(user.role, role);
    await page.locator('input[type=password]').waitFor({state: 'hidden'});
    const tickets = await context.request.get(origin + '/api/tickets', {headers: {Authorization: 'Bearer ' + token}});
    assert.equal(tickets.status(), 200);
    const rows = await tickets.json();
    assert.ok(rows.length > 0, 'Expected seeded tickets');
    if (role === 'EMPLOYEE') assert.ok(rows.every(row => row.owner.id === user.id));
    if (role === 'ENGINEER') assert.ok(rows.every(row => row.engineer?.id === user.id));
    const report = await context.request.get(origin + '/api/reports/tickets.csv', {headers: {Authorization: 'Bearer ' + token}});
    assert.equal(report.status(), role === 'ADMIN' ? 200 : 403);
    await page.reload();
    await page.getByRole('heading', {name: /overview|dashboard/i}).first().waitFor();
    assert.deepEqual(errors, []);
    page.on('dialog', dialog => dialog.accept());
    pages[account] = page;
    console.log(role + ' passed browser login, dashboard reload, ticket scope and report access.');
  }
  const {employee,engineer,admin} = pages;
  async function submit(page,label,endpoint) {
    const [response] = await Promise.all([
      page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(endpoint)),
      page.getByRole('button',{name:label,exact:true}).click(),
    ]);
    assert.equal(response.status(),200,label);
    return response.json();
  }
  await employee.getByRole('link',{name:'Ticket queue'}).click();
  await employee.getByRole('button',{name:'New ticket'}).click();
  await employee.getByLabel('Subject',{exact:true}).fill('Meeting room display loses signal');
  await employee.getByLabel('Description',{exact:true}).fill('The display disconnects when changing the input on the conference dock.');
  await employee.locator('[name=categoryId]').selectOption({label:'Hardware'});
  await employee.locator('[name=priorityId]').selectOption({label:'Medium'});
  const ticket=await submit(employee,'Create ticket','/api/tickets');
  const url=origin+'/tickets/'+ticket.id;
  await admin.goto(url);
  await admin.locator('[name=engineerId]').selectOption({label:'Leo Bennett'});
  await submit(admin,'Save assignment','/assign');
  await engineer.goto(url);
  await engineer.locator('[name=status]').selectOption('IN_PROGRESS');
  await submit(engineer,'Update status','/status');
  await engineer.getByLabel('Add a comment').fill('Verified the problem at the conference dock.');
  await submit(engineer,'Post comment','/comments');
  await engineer.locator('[name=status]').selectOption('RESOLVED');
  await engineer.getByLabel('Resolution note').fill('Replaced the faulty display adapter and verified a stable signal.');
  await submit(engineer,'Update status','/status');
  await employee.goto(url);
  await submit(employee,'Confirm resolution','/status');
  await employee.getByText('Closed',{exact:true}).first().waitFor();
  await employee.setViewportSize({width:390,height:844});
  await employee.getByRole('button',{name:'Open navigation'}).click();
  await employee.getByRole('link',{name:'Overview',exact:true}).click();
  await employee.getByRole('button',{name:'Switch to dark mode'}).click();
  assert.equal(await employee.locator('html').getAttribute('data-theme'),'dark');
  assert.ok(await employee.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Dashboard exceeds mobile viewport');
  console.log('Ticket '+ticket.id+' passed three-role UI creation, assignment, investigation, comment, resolution and closure. Mobile navigation and dark mode passed.');
} finally {
  await browser.close();
}
