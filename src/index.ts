import puppeteer, { HTTPResponse } from 'puppeteer';
import * as Process from 'process';
import { JSDOM } from 'jsdom';
import { multilinesIntoObject } from "./util";
import { JsonDB } from 'node-json-db';
import { Config } from "node-json-db/dist/lib/JsonDBConfig";

const store = new JsonDB(new Config('store', true, true))

async function scrapDetails(event: HTTPResponse) {
  if (
    !event.ok() ||
    event.url() != 'https://planzajec.pjwstk.edu.pl/PlanOgolny.aspx'
  )
    return;
  const responses = (await event.text()).split('|');
  const fragment = JSDOM.fragment(responses[7]); // just 7, just csv things

  if (!fragment.textContent) return;
  const content = fragment.textContent
    .replace(RegExp('(^\\s+$| {2,})', 'gm'), '')
    .replace(RegExp('\\n+', 'gm'), '\n')
    .trim()
  store.push('/schedule[]', multilinesIntoObject(content))
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();

  await page.goto('https://planzajec.pjwstk.edu.pl/PlanOgolny.aspx');
  const subjects = await page.$$('.rsAptSubject');

  await page.setRequestInterception(true);
  page.on('request', async (event) => event.continue());
  page.on('response', scrapDetails);

  let progress = 0;

  for (const subject of subjects) {
    console.log(`${++progress}/${subjects.length}`);
    await subject.hover();
    await page.waitForTimeout(2500);
  }
}

main().then(() => Process.exit());
