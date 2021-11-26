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
  const datePicker = await page.$('#DataPicker_dateInput')
  await datePicker?.click()
  await datePicker?.press('Backspace')
  await datePicker?.type('2021-11-25')
  await datePicker?.press('Enter')
  await page.waitForTimeout(2000)
  // find all subjects
  // const subjects = await page.$x('//*[matches(@id, "\d+;r")]');
  const subjects = await page.$x("//td[contains(@id, ';')]")

  // enable request interception
  await page.setRequestInterception(true)
  page.on('request', async (event) => event.continue())

  let progress = 0
  const progressBar = new SingleBar({})
  progressBar.start(subjects.length, 0)

  for (const subject of subjects) {
    await subject.hover()
    const response = await page.waitForResponse(
      'https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx'
    )
    await scrapDetails(response)
    // console.log(`${++progress}/${subjects.length}`);
    progressBar.update(++progress)
  }
  progressBar.stop()
}

main().then(() => Process.exit())
