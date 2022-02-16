import pino from 'pino'
import { Browser, Page } from 'puppeteer'
import { CredentialsPair } from './types'
import { DateTime } from 'luxon'

export class InvalidStudentNumber extends Error {}

export class NotLoggedIn extends Error {}

export class PrivateScheduleScrapper {
  private readonly browser: Browser
  private readonly log = pino()
  private readonly credentials: CredentialsPair
  private activePageWeek?: Page

  constructor (browser: Browser, credentials: CredentialsPair) {
    this.browser = browser
    if (!credentials.studentNumber.match(/s\d+/)) throw new InvalidStudentNumber(credentials.studentNumber)
    this.credentials = credentials
  }

  async login () {
    const page = await this.browser.newPage()
    await page.goto('https://planzajec.pjwstk.edu.pl/Logowanie.aspx')
    const usernameInput = await page.$('#ContentPlaceHolder1_Login1_UserName')
    const passwordInput = await page.$('#ContentPlaceHolder1_Login1_Password')
    await usernameInput!.type(this.credentials.studentNumber)
    await passwordInput!.type(this.credentials.password)
    await page.click('#ContentPlaceHolder1_Login1_LoginButton')
    await page.waitForTimeout(2000)
    this.activePageWeek = page
  }

  async fetchCurrentWeek () {
    if (!this.activePageWeek) throw new NotLoggedIn()
    const subjects = await this.activePageWeek.$$('.rsAptSubject')

    for (const subject of subjects) {
      await subject.hover()
      await this.activePageWeek.waitForResponse('https://planzajec.pjwstk.edu.pl/TwojPlan.aspx', { timeout: 15000 })
    }
  }

  async getDateRange () {
    const headerText = await this.activePageWeek?.$('.rsHeader h2')
    const text = await headerText?.evaluate(node => node.textContent)
    if (text === null || text === undefined) return null
    const [start, end] = text.split(' - ')
    return { start: DateTime.fromFormat(start.trim(), 'dd.MM.yyyy'), end: DateTime.fromFormat(end.trim(), 'dd.MM.yyyy') }
  }

  async loadNextWeek () {
    const nextWeekButton = await this.activePageWeek?.$('.rsNextDay')
    await nextWeekButton?.click()
    await this.activePageWeek?.waitForTimeout(2000)
  }

  async loadPrevWeek () {
    const nextWeekButton = await this.activePageWeek?.$('.rsPrevDay')
    await nextWeekButton?.click()
    await this.activePageWeek?.waitForTimeout(2000)
  }
}
