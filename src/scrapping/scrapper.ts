import { Browser } from 'puppeteer'
import { serializeOutput } from '../util'
import 'dotenv/config'
import { Connection, getConnection } from 'typeorm'
import moment from 'moment'
import { ScheduleEntry } from '../entity/Schedule'

export default class Scrapper {
  private readonly browser: Browser
  private readonly conn?: Connection

  constructor (browser: Browser) {
    this.browser = browser
    this.conn = getConnection()
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
        await this.conn?.manager.save(
          this.dataToEntity(data)
        )
      }
    })

    // clear database before dumping
    await ScheduleEntry.delete({ dateString: date })

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

  dataToEntity (obj: Record<string, string>): ScheduleEntry {
    const entry = new ScheduleEntry()
    entry.begin = moment(`${obj['Data zajęć']} ${obj['Godz. rozpoczęcia']}`, 'DD.MM.YYYY HH:mm:ss').toDate()
    entry.end = moment(`${obj['Data zajęć']} ${obj['Godz. zakończenia']}`, 'DD.MM.YYYY HH:mm:ss').toDate()
    entry.dateString = moment(`${obj['Data zajęć']} ${obj['Godz. zakończenia']}`, 'DD.MM.YYYY HH:mm:ss').format('YYYY-MM-DD')
    entry.type = obj['Typ zajęć']
    entry.code = obj['Kody przedmiotów']
    entry.name = obj['Nazwy przedmiotów']
    entry.room = obj['Sala']
    entry.tutor = obj['Dydaktycy']
    entry.groups = obj['Grupy']
    entry.building = obj['Budynek']

    return entry
  }
}
