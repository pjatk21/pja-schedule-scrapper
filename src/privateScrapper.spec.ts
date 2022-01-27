import { describe, it, before } from 'mocha'
import puppeteer, { Browser } from 'puppeteer'
import { PrivateScheduleScrapper } from './privateScrapper'
import 'dotenv/config'

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

  it('fetch auto loaded week', async () => {
    await scrapper.fetchCurrentWeek()
  }).timeout(0)
})
