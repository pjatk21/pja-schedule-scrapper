import puppeteer, { HTTPResponse } from 'puppeteer'
import * as Process from 'process'
import { JSDOM } from 'jsdom'
import { multilinesIntoObject } from './util'
import { JsonDB } from 'node-json-db'
import { Config } from 'node-json-db/dist/lib/JsonDBConfig'
import { SingleBar } from 'cli-progress'

const store = new JsonDB(new Config('store', true, true))

async function scrapDetails(event: HTTPResponse) {
  if (
    !event.ok() ||
    event.url() != 'https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx'
  )
    return
  const responses = (await event.text()).split('|')
  const fragment = JSDOM.fragment(responses[7]) // just 7, just csv things

  if (!fragment.textContent) return
  const content = fragment.textContent
    .replace(RegExp('(^\\s+$| {2,})', 'gm'), '')
    .replace(RegExp('\\n+', 'gm'), '\n')
    .trim()
  store.push('/schedule[]', multilinesIntoObject(content))
}

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
  })
  const page = await browser.newPage()

  await page.goto('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx')
  // set date
  /*
  const datePicker = await page.$('#DataPicker_dateInput')
  await datePicker?.click()
  await datePicker?.press('Backspace')
  await datePicker?.type('2021-11-25')
  await datePicker?.press('Enter')
  await page.waitForTimeout(2000) */
  // find all subjects
  // const subjects = await page.$x('//*[matches(@id, "\d+;r")]'); // puppeteer does not support XPath 2.0
  const subjects = await page.$x("//td[contains(@id, ';')]") // works so far

  // enable request interception
  await page.setRequestInterception(true)
  page.on('request', async (event) => event.continue())

  let progress = 0
  const progressBar = new SingleBar({})
  progressBar.start(subjects.length, 0)


  for (const subject of subjects) {
    await subject.hover()
    try {
      const response = await page.waitForResponse(
        'https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx',
        {timeout: 800}
      )
      await scrapDetails(response)
      await page.waitForTimeout(150) // poll rate limit
    } catch (e) {
      // console.warn(e)
      await page.waitForTimeout(1000) // poll rate limit aggressive
    }

    progressBar.update(++progress)
  }
  progressBar.stop()
}

main().then(() => Process.exit())
