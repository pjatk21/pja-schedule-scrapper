import { describe, it, before } from 'mocha'
import puppeteer, { Browser } from 'puppeteer'
import { PrivateScheduleScrapper } from './privateScrapper'
import 'dotenv/config'
import { assert } from 'console'

describe('Private Scrapper', () => {
  let browser: Browser
  let scrapper: PrivateScheduleScrapper

  before(async () => {
    browser = await puppeteer.launch({ headless: false })
    scrapper = new PrivateScheduleScrapper(browser, { studentNumber: process.env.STUDENT!, password: process.env.PASSWORD! })
  })

  it('login', async () => {
    await scrapper.login()
  }).timeout(0)

  it('next page', async () => {
    await scrapper.loadNextWeek()
  }).timeout(5000)

  it('prev page', async () => {
    await scrapper.loadPrevWeek()
  }).timeout(5000)

  it('get range', async () => {
    const range = (await scrapper.getDateRange())!
    assert(range, 'range is null')
    assert(range.start < range.end, 'mismatch arrangement, end is before start')
    console.log(range)
  }).timeout(5000)

  it('fetch loaded week', async () => {
    await scrapper.fetchCurrentWeek()
  }).timeout(0)
})
