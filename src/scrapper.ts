import puppeteer, { Browser } from 'puppeteer'
import { serializeOutput } from './util'
import { DateTime } from 'luxon'
import { ScheduleEntry } from './interfaces'
import pino from 'pino'

export default class Scrapper {
  private readonly browser: Browser
  private readonly log = pino()

  constructor (browser: Browser) {
    this.browser = browser
  }

  public static async dockerRuntime () {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-dev-shm-usage']
    })
    return {
      browser,
      scrapper: new Scrapper(browser)
    }
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
    let subjects = await page.$x("//td[contains(@id, ';')]") // works so far, but really fragile solution
    if (process.env.NODE_ENV === 'development') {
      subjects = subjects.slice(0, 5)
      this.log.debug('Reduced subjects to:', subjects.length)
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

    // setup progress bar
    let progress = 0
    let errored = 0

    // iterate over entries
    for (const subject of subjects) {
      try {
        await subject.hover()
        await page.waitForResponse('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx', { timeout: 20000 })
      } catch (e) {
        errored++
        this.log.warn(e)
      }
      this.log.info({ date }, `Downloaded ${++progress} of ${subjects.length} (${Math.round(progress / subjects.length * 100)}%)`)
    }

    return { date, entries, errorRate: errored / subjects.length }
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
