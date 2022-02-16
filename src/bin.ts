import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import ScheduleScrapper from './scrapper'
import { DateTime } from 'luxon'
import got from 'got'
import { ScheduleEntry } from './interfaces'

yargs(hideBin(process.argv))
  .option('api', {
    'default': 'http://localhost:3000',
    description: 'Base API URL'
  })
  .command('public', 'Scraps public schedule', (yargs) => {
    return yargs
      .option('limit', {
        description: 'Limit the number of results',
        type: 'number'
      })
      .option('date', {
        description: 'Date to scrape',
        default: DateTime.now().toFormat('yyyy-MM-dd')
      })
  }, async ({ limit, date, api }) => {
    const { scrapper } = await ScheduleScrapper.dockerRuntime()
    const result = await scrapper.fetchDay({ dateString: date, limit })
    console.log(result.entries)
    for (const e in result.entries) {
      const response = await got.post(api + '/public/timetable/upload', {
        json: e as any
      })
      console.log(response)
    }
    process.exit()
  })
  .parse()
