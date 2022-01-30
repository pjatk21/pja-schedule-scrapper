import { describe, it, beforeEach, afterEach } from 'mocha'
import puppeteer, { Browser } from 'puppeteer'
import ScheduleScrapper from './scrapper'
import 'dotenv/config'
import assert from 'assert'

describe('Common schedule scrapper', () => {
  let browser: Browser
  let scrapper: ScheduleScrapper

  beforeEach(async () => {
    browser = await puppeteer.launch({ headless: false })
    scrapper = new ScheduleScrapper(browser)
  })

  afterEach(async () => {
    await browser.close()
  })

  it('fetch (short)', async () => {
    const { errored } = await scrapper.fetchDay({ skip: 10, limit: 20 })
    assert.equal(errored.length, 0)
  }).timeout(0)

  it('fetch (fast)', async () => {
    const { errored } = await scrapper.fetchDay({ limit: 40, maxTimeout: 1200 })
    assert.equal(errored.length, 0)
  }).timeout(0)
})
