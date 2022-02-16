import puppeteer from 'puppeteer'
import ScheduleScrapper from './scrapper'
export { ScheduleEntry } from './interfaces'
export { ScheduleScrapper }

export async function fetchDay(date?: string) {
  const browser = await puppeteer.launch({
    headless: true,
  })

  const result = await new ScheduleScrapper(browser).fetchDay({
    dateString: date,
  })
  return result
}

export async function fetchDays(dates: string[]) {
  const browser = await puppeteer.launch({
    headless: true,
  })

  const scrapper = new ScheduleScrapper(browser)
  const results = []
  for (const date of dates) {
    results.push(await scrapper.fetchDay({ dateString: date }))
  }
  return results
}
