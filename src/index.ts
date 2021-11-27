import puppeteer, { HTTPRequest, HTTPResponse } from "puppeteer";
import * as Process from 'process'
import { JSDOM } from 'jsdom'
import { multilinesIntoObject } from './util'
import { JsonDB } from 'node-json-db'
import { Config } from 'node-json-db/dist/lib/JsonDBConfig'
import { SingleBar } from 'cli-progress'
import { writeFile } from "fs/promises";

const store = new JsonDB(new Config('store', true, true))

async function main(date: string, category?: string) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1600,
      height: 900,
    }
  })
  const page = await browser.newPage()

  await page.goto('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx')
  // set date

  const datePicker = await page.$('#DataPicker_dateInput')
  await datePicker?.click()
  await datePicker?.press('Backspace')
  await datePicker?.type(date)
  await datePicker?.press('Enter')
  await page.waitForTimeout(2000)

  // find all subjects
  // const subjects = await page.$x('//*[matches(@id, "\d+;r")]'); // puppeteer does not support XPath 2.0
  const subjects = await page.$x("//td[contains(@id, ';')]") // works so far

  // enable request interception
  await page.setRequestInterception(true)
  page.on('request', async (event) => event.continue())

  let progress = 0
  const progressBar = new SingleBar({})
  progressBar.start(subjects.length, 0)

  const requests: HTTPRequest[] = []

  page.on('request',  event => {
    if (event.url() === 'https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx') requests.push(event)
    // event.continue()
  })

  for (const subject of subjects.slice(0, 10)) {
    await subject.hover()
    try {
      await page.waitForResponse('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx', {timeout: 1000})
    } catch (e) {
      // console.debug('another', e)
    }
    progressBar.update(requests.length)
  }
  progressBar.stop()

  await writeFile('result.json', JSON.stringify(
    requests.map(r => { return {
      headers: r.headers(),
      body: r.postData(),
      response: r.response()?.text() ?? null
    }})
  ))
}

main('2021-11-29').then(() => Process.exit())
