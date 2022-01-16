import puppeteer from 'puppeteer'
import Scrapper from './scrapping/scrapper'

export async function fetchDay (date: string) {
  const browser = await puppeteer.launch({
    headless: true
  })

  const result = await new Scrapper(browser).fetchDay(date)
  return result
}

export async function fetchDays (dates: string[]) {
  const browser = await puppeteer.launch({
    headless: true
  })

  const scrapper = new Scrapper(browser)
  const results = []
  for (const date of dates) {
    results.push(await scrapper.fetchDay(date))
  }
  return results
}
