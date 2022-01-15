import puppeteer from 'puppeteer'
import Scrapper from './scrapping/scrapper'
import 'dotenv/config'

async function index () {
  // create browser session for data scrapping
  const browser = await puppeteer.launch({
    headless: true
  })

  // create scrapper with some test data
  const scrapper = new Scrapper(browser)
  const dates = ['2022-01-14', '2022-01-11']
  const results = []

  for (const date of dates) {
    results.push(await scrapper.fetchDay(date))
  }

  // log raw, but serialized results
  const [a, b] = results
  console.log(a.entries.length, b.entries.length)
}

index().then(() => process.exit())

// fetchAndDump('2022-01-14').then(() => process.exit())
