import puppeteer from 'puppeteer'
import Scrapper from './scrapper'
import 'dotenv/config'

async function index () {
  console.info(process.env)

  const browser = await puppeteer.launch({
    headless: true
  })

  const scrapper = new Scrapper(browser)
  const dates = ['2022-01-14', '2022-01-11']
  const results = []

  for (const date of dates) {
    results.push(await scrapper.fetchDay(date))
  }

  const [a, b] = results

  console.log(a.entries.length, b.entries.length)
}

index().then(() => process.exit())

// fetchAndDump('2022-01-14').then(() => process.exit())
