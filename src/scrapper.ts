import puppeteer, { Browser } from 'puppeteer'
import { serializeOutput } from './util'
import { DateTime } from 'luxon'
import { ScheduleEntry } from './interfaces'
import pino from 'pino'
import { ScheduleScrappingOptions } from './types'

/**
 * Class for handling scraping schedule.
 */
export default class ScheduleScrapper {
  private readonly browser: Browser
  private readonly log = pino()

  constructor (browser: Browser) {
    this.browser = browser
  }

  /**
   * Method for creating scrapper inside docker container. Still require installed chromium.
   * @returns created browser instance and scrapper itself
   */
  public static async dockerRuntime () {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-dev-shm-usage']
    })
    return {
      browser,
      scrapper: new ScheduleScrapper(browser)
    }
  }

  /**
   * Fetches selected day of schedule from the website.
   * @param options performance related settings
   * @returns object with date, fetched data, errored HTM and error rate
   */
  async fetchDay (options: ScheduleScrappingOptions = {}) {
    const page = await this.browser.newPage()
    await page.goto('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx')

    // set date inside browser
    if (options.dateString) {
      const datePicker = await page.$('#DataPicker_dateInput')
      await datePicker?.click()
      await datePicker?.press('Backspace')
      await datePicker?.type(options.dateString)
      await datePicker?.press('Enter')
      await page.waitForTimeout(2000)
    }

    // find all subjects
    let subjects = await page.$x("//td[contains(@id, ';')]") // works so far, but really fragile solution

    if (options.skip || options.limit) {
      subjects = subjects.slice(options.skip, options.limit)
      this.log.debug('Reduced subjects to: ' + subjects.length)
    }

    // enable request interception
    await page.setRequestInterception(true)
    page.on('request', async (event) => event.continue())

    // store entries for debug purposes
    const entries: ScheduleEntry[] = []

    // create listener for each entry
    page.on('response', async event => {
      if (event.url() === 'https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx') {
        const data = serializeOutput(await event.text()) ?? {}
        entries.push(
          this.dataToEntry(data)
        )
      }
    })

    // setup progress tracker
    let progress = 0
    const errored = []

    const date = options.dateString ?? DateTime.local().toFormat('yyyy-MM-dd')

    // iterate over entries
    for (const subject of subjects) {
      try {
        await subject.hover()
        await page.waitForResponse('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx', { timeout: options.maxTimeout ?? 20000 })
        this.log.info({ date }, `Downloaded ${++progress} of ${subjects.length} (${Math.round(progress / subjects.length * 100)}%)`)
      } catch (e) {
        if (e instanceof puppeteer.TimeoutError) {
          errored.push(subject)
          this.log.warn(e)
        }
        this.log.fatal(e)
      }
    }

    // retry failed entries
    if (options.repeatTimeouts ?? true) {
      while (errored.length) {
        const subject = errored.pop()!
        try {
          this.log.debug({ subject }, 'Retrying fetching subject...')
          await subject.hover()
          await page.waitForResponse('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx', { timeout: options.maxTimeout ?? 20000 })
        } catch (e) {
          this.log.error({ exception: e }, 'Failed to fetch timeouted subject!')
        }
      }
      this.log.info({ date }, `Fetch retried (${Math.round(++progress / subjects.length * 100)}%)`)
    }

    return { date, entries, errored, errorRate: errored.length / subjects.length }
  }

  private dataToEntry (obj: Record<string, string>): ScheduleEntry {
    const begin = DateTime.fromFormat(`${obj['Data zajęć']} ${obj['Godz. rozpoczęcia']}`, 'dd.MM.yyyy HH:mm:ss').toJSDate()
    const end = DateTime.fromFormat(`${obj['Data zajęć']} ${obj['Godz. zakończenia']}`, 'dd.MM.yyyy HH:mm:ss').toJSDate()
    const dateString = DateTime.fromFormat(obj['Data zajęć'], 'dd.MM.yyyy').toFormat('yyyy-MM-dd')
    return {
      begin,
      end,
      dateString,
      type: obj['Typ zajęć'],
      code: obj['Kody przedmiotów'],
      name: obj['Nazwy przedmiotów'],
      room: obj.Sala,
      tutor: obj.Dydaktycy,
      groups: obj.Grupy,
      building: obj.Budynek
    }
  }
}
