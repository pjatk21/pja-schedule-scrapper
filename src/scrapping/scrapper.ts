import { JsonDB } from 'node-json-db'
import { Browser } from 'puppeteer'
import { serializeOutput } from '../util'
import 'dotenv/config'

export default class Scrapper {
  private readonly browser: Browser
  private readonly store?: JsonDB

  constructor (browser: Browser) {
    this.browser = browser
  }

  async fetchDay (date: string) {
    const page = await this.browser.newPage()
    await page.goto('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx')

    // set date inside browser
    const datePicker = await page.$('#DataPicker_dateInput')
    await datePicker?.click()
    await datePicker?.press('Backspace')
    await datePicker?.type(date)
    await datePicker?.press('Enter')
    await page.waitForTimeout(2000)

    // find all subjects
    let subjects = await page.$x("//td[contains(@id, ';')]") // works so far
    if (process.env.ENV === 'dev') {
      subjects = subjects.slice(0, 20)
    }

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
        // this.store.push(`/raw/${date}}[]`, entries)
      }
    })

    // clear database before dumping
    /* try {
      this.store.push(`/raw/${date}`, [])
    } catch (e) {
      console.warn(e)
    } */

    // setup progress bar
    let progress = 0

    // iterate over entries
    for (const subject of subjects) {
      await subject.hover()
      try {
        await page.waitForResponse('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx', { timeout: 12000 })
      } catch (e) {
        console.warn(e)
      }
      console.debug(date, ++progress, 'of', subjects.length)
    }

    return { date, entries }
  }
}
