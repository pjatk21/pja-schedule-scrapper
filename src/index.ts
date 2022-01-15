import puppeteer from 'puppeteer'
import { serializeOutput } from './util'
import { JsonDB } from 'node-json-db'
import { Config } from 'node-json-db/dist/lib/JsonDBConfig'
import { SingleBar } from 'cli-progress'
import { writeFile } from 'fs/promises'
import 'dotenv/config'

const store = new JsonDB(new Config('store', true, true))

async function fetchAndDump (date: string) {
  const browser = await puppeteer.launch({
    // headless: process.env.ENV === 'prod',
    headless: true,
    defaultViewport: {
      width: 1600,
      height: 900
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
  await page.waitForTimeout(parseInt(process.env.TIMEOUT_PAGELOAD ?? '1000'))

  // find all subjects
  // const subjects = await page.$x('//*[matches(@id, "\d+;r")]'); // puppeteer does not support XPath 2.0
  const subjects = process.env.ENV === 'dev' ? (await page.$x("//td[contains(@id, ';')]")).slice(0, 20) : await page.$x("//td[contains(@id, ';')]") // works so far

  // enable request interception
  await page.setRequestInterception(true)
  page.on('request', async (event) => event.continue())

  // store entries for debug purposes
  const entries: Record<any, any>[] = []

  // create listener for each entry
  page.on('response', async event => {
    if (event.url() === 'https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx') {
      const data = serializeOutput(await event.text()) ?? {}
      entries.push(data)
      store.push(`/raw/${data['Data zajęć']}[]`, entries)
    }
  })

  // clear database before dumping
  try {
    store.push(`/raw/${date}`, [])
  } catch (e) {
    console.warn(e)
  }

  // setup progress bar
  let progress = 0
  const progressBar = new SingleBar({})
  progressBar.start(subjects.length, 0)

  // iterate over entries
  for (const subject of subjects) {
    await subject.hover()
    try {
      await page.waitForResponse('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx', { timeout: parseInt(process.env.TIMEOUT_INTERCEPTION ?? '10000') })
    } catch (e) {
      console.warn(e)
    }
    progressBar.update(++progress)
  }
  progressBar.stop()

  if (process.env.ENV === 'dev') {
    await writeFile('dump.json', JSON.stringify(
      entries, undefined, 2
    ))
  }
}

fetchAndDump('2022-01-14').then(() => process.exit())
