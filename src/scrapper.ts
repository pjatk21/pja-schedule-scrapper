import puppeteer, { Browser } from 'puppeteer'
import { serializeOutput } from './util'
import { DateTime } from 'luxon'
import { ScheduleEntry } from './interfaces'
import type { Logger } from 'pino'
import { ScheduleScrappingOptions } from './types'
import { GroupCoder, InvalidGroupCodeError } from './groupCoder'

/**
 * Class for handling scraping schedule.
 */
export default class ScheduleScrapper {
  private readonly browser: Browser
  public log?: Logger

  constructor(browser: Browser) {
    this.browser = browser
  }

  /**
   * Method for creating scrapper inside docker container. Still require installed chromium.
   * @returns created browser instance and scrapper itself
   */
  public static async dockerRuntime() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-dev-shm-usage'],
    })
    return {
      browser,
      scrapper: new ScheduleScrapper(browser),
    }
  }

  public static async userRuntime() {
    const browser = await puppeteer.launch({
      headless: false,
    })
    return {
      browser,
      scrapper: new ScheduleScrapper(browser),
    }
  }

  /**
   * Calculates ETA
   * @param start
   * @param iterations
   * @returns Estimated fetch time in milliseconds
   */
  private eta(
    start: DateTime,
    iterations: number,
    collectionSize: number
  ): number {
    const avgTime = DateTime.now().diff(start).milliseconds / iterations
    return avgTime * (collectionSize - iterations)
  }

  /**
   * Fetches selected day of schedule from the website.
   * @param options performance related settings
   * @returns object with date, fetched data, errored HTM and error rate
   */
  async fetchDay(options: ScheduleScrappingOptions = {}) {
    this.log?.debug('Open new page')
    const page = await this.browser.newPage()
    this.log?.debug('Open schedule page')
    await page.goto('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx')

    // set date inside browser
    if (options.dateString) {
      this.log?.info(`Setting date ${options.dateString}`)
      const datePicker = await page.$('#DataPicker_dateInput')
      await datePicker?.click()
      await datePicker?.press('Backspace')
      await datePicker?.type(options.dateString)
      await datePicker?.press('Enter')
      await page.waitForTimeout(2000)
    }

    // find all subjects
    let subjects = await page.$x("//td[contains(@id, ';')]") // works so far, but really fragile solution
    this.log?.info(`Found ${subjects.length} subjects`)

    if (options.filter) {
      const subjectsFiltered = []

      for (const subject of subjects) {
        const preview = (await page.evaluate(
          (el) => el.innerText,
          subject
        )) as string

        // Try extracting group name from preview
        const inlinePreview = preview.replaceAll(/\s/g, ' ')

        let group
        try {
          group = new GroupCoder().decode(inlinePreview)
        } catch (e) {
          group = undefined
        }

        if (options.filter({ preview, inlinePreview, raw: subject, group })) {
          subjectsFiltered.push(subject)
        }
      }

      subjects = subjectsFiltered
    }

    if (options.skip || options.limit) {
      subjects = subjects.slice(options.skip, options.limit)
      this.log?.info('Reduced subjects to: ' + subjects.length)
    }

    // enable request interception
    await page.setRequestInterception(true)
    page.on('request', async (event) => event.continue())

    // store entries for debug purposes
    const entries: ScheduleEntry[] = []

    // create listener for each entry
    page.on('response', async (event) => {
      if (event.url() === 'https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx') {
        const data = serializeOutput(await event.text()) ?? {}
        entries.push(this.dataToEntry(data))
      }
    })

    // setup progress tracker
    let progress = 0
    const errored = []

    const date = options.dateString ?? DateTime.local().toFormat('yyyy-MM-dd')
    const start = DateTime.now()

    // iterate over entries
    for (const subject of subjects) {
      try {
        await subject.hover()
        await page.waitForResponse(
          'https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx',
          { timeout: options.maxTimeout ?? 5000 }
        )

        this.log?.debug(
          {
            date,
            iteration: ++progress,
            eta: this.eta(start, progress, subjects.length),
          },
          `Downloaded ${progress} of ${subjects.length} (${Math.round(
            (progress / subjects.length) * 100
          )}%)`
        )
      } catch (e) {
        // @ts-expect-error just some fucking weird JS wizardry
        if (e.name === 'TimeoutError') {
          errored.push(subject)
          this.log?.warn('Timeout while fetching subject! Will retry later.')
        } else {
          this.log?.fatal(e)
        }
      }
    }

    this.log?.info(
      `${progress} of ${subjects.length} subjects fetched, performing cleanup/repeating timeouted requests`
    )

    // retry failed entries
    if (options.repeatTimeouts ?? true) {
      while (errored.length) {
        const subject = errored.pop()!
        try {
          this.log?.debug('Retrying fetching subject!')
          await subject.hover()
          await page.waitForResponse(
            'https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx',
            { timeout: 30000 }
          )
          this.log?.debug('Retry succeeded!')
        } catch (e) {
          this.log?.error(
            { exception: e },
            'Failed to fetch timeouted subject!'
          )
        }
        this.log?.debug(
          { date },
          `Fetch retried (${Math.round((++progress / subjects.length) * 100)}%)`
        )
      }
    }

    if (options.closePage ?? true) {
      await page.close({ runBeforeUnload: true })
    }

    return {
      date,
      entries,
      errored,
      errorRate: errored.length / subjects.length,
      page: options.closePage ?? true ? undefined : page,
    }
  }

  private dataToEntry(obj: Record<string, string>): ScheduleEntry {
    const begin = DateTime.fromFormat(
      `${obj['Data zajęć']} ${obj['Godz. rozpoczęcia']}`,
      'dd.MM.yyyy HH:mm:ss'
    ).toJSDate()
    const end = DateTime.fromFormat(
      `${obj['Data zajęć']} ${obj['Godz. zakończenia']}`,
      'dd.MM.yyyy HH:mm:ss'
    ).toJSDate()
    const dateString = DateTime.fromFormat(
      obj['Data zajęć'],
      'dd.MM.yyyy'
    ).toFormat('yyyy-MM-dd')
    let groups

    try {
      groups = obj.Grupy?.split(', ').map((gc) => new GroupCoder().decode(gc))
    } catch (e) {
      if (e instanceof InvalidGroupCodeError) {
        this.log?.error({ groupName: e.groupCode }, 'Non-generic group code!')
      } else {
        this.log?.fatal(e)
      }

      groups = undefined
    }

    return {
      begin,
      end,
      dateString,
      type: obj['Typ zajęć'],
      code: obj['Kody przedmiotów'],
      name: obj['Nazwy przedmiotów'],
      room: obj.Sala,
      tutor: obj.Dydaktycy,
      groups,
      building: obj.Budynek,
    }
  }
}
