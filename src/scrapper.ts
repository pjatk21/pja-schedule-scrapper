import { Browser } from 'puppeteer'
import { serializeOutput } from './util'
import moment from 'moment'
import { ScheduleEntry } from './interfaces'

export default class Scrapper {
  private readonly browser: Browser

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
    let subjects = await page.$x("//td[contains(@id, ';')]") // works so far, but really fragile solution
    if (process.env.NODE_ENV === 'development') {
      console.log('small slice to 5')
      subjects = subjects.slice(0, 5)
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

  private dataToEntry (obj: Record<string, string>): ScheduleEntry {
    return {
      begin: moment(`${obj['Data zajęć']} ${obj['Godz. rozpoczęcia']}`, 'DD.MM.YYYY HH:mm:ss').toDate(),
      end: moment(`${obj['Data zajęć']} ${obj['Godz. zakończenia']}`, 'DD.MM.YYYY HH:mm:ss').toDate(),
      dateString: moment(`${obj['Data zajęć']} ${obj['Godz. zakończenia']}`, 'DD.MM.YYYY HH:mm:ss').format('YYYY-MM-DD'),
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
