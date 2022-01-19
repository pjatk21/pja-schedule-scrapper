/**
 * Includes settings (date, repeat timeouts etc.) for scraping schedule.
 */
export type ScheduleScrappingOptions = {
  /**
   * Date to fetch. If not set, current date is used.
   */
  dateString?: string
  /**
   * Repeat timed out requests. Defaults to true.
   */
  repeatTimeouts?: boolean
  /**
   * Maximum time to wait for a response. Defaults to 20000.
   */
  maxTimeout?: number
  limit?: number
  skip?: number
}

