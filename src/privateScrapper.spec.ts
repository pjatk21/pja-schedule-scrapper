import { describe, it } from 'mocha'
import puppeteer from 'puppeteer'
import { PrivateScheduleScrapper } from './privateScrapper'

describe('Private Scrapper', () => {
  it('login and hover', async () => {
    const browser = await puppeteer.launch({ headless: false })
    const psc = new PrivateScheduleScrapper(browser, { studentNumber: 's25290', password: '!L0ckp1ck_pjatk' })
    await psc.login()
    await psc.fetchCurrentWeek()
    await browser.close()
  }).timeout(0)
})
