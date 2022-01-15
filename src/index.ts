import puppeteer from 'puppeteer'
import Scrapper from './scrapping/scrapper'
import 'dotenv/config'
import { createConnection } from 'typeorm'
import { Entry } from './entity/Entry'

async function index () {
  // console.info(process.env)

  await createConnection()

  const e = new Entry()
  e.begin = new Date()
  e.end = new Date()
  e.code = 'aaa'
  e.save()

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
