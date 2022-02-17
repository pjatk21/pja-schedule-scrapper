#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import ScheduleScrapper from './scrapper'
import { DateTime } from 'luxon'
import 'dotenv/config'
import pino from 'pino'

yargs(hideBin(process.argv))
  .option('perf', {
    description: 'Run chromium in "user" mode (no-headless, no special args)',
    default: false,
    type: 'boolean',
  })
  .command(
    'loop',
    'Looped fetch',
    (yargs) => {
      return yargs
        .option('delay', {
          description: 'Delay between loops',
          default: 60 * 60,
        })
        .option('offset', {
          description: 'Offset in days',
          type: 'number',
          default: 0,
        })
        .option('loopSize', {
          description: 'How many days should be included in the loop',
          type: 'number',
          default: 7,
        })
        .option('once', {
          description:
            'If set to true, runs loop only once, useful for benchmarking',
          type: 'boolean',
          default: false,
        })
    },
    async ({ api, delay, perf, offset, loopSize, once }) => {
      const loopLog = pino({
        name: 'Loop',
        transport: {
          target: 'pino-pretty',
        },
      })
      loopLog.info(
        { api, delay, perf, offset, loopSize, once },
        'Configuration variables'
      )
      let loopCount = 0
      const { scrapper } = perf
        ? await ScheduleScrapper.userRuntime()
        : await ScheduleScrapper.dockerRuntime()
      scrapper.log = pino({
        name: 'Scrapper',
        transport: { target: 'pino-pretty' },
      })

      do {
        const dates = Array.from(Array(loopSize).keys()).map((n) => {
          return DateTime.now()
            .minus({ days: offset })
            .plus({ days: n })
            .toFormat('yyyy-MM-dd')
        })

        loopLog.info(
          { dates, loopCount: ++loopCount },
          `Running loop no. ${loopCount}`
        )

        for (const date of dates) {
          const start = DateTime.now()
          const result = await scrapper.fetchDay({ dateString: date })
          loopLog.info(
            {
              date: result.date,
              resultsCount: result.entries.length,
              errors: {
                count: result.errored.length,
                rate: result.errorRate,
              },
            },
            `Day ${date} fetched in ${
              DateTime.now().diff(start).milliseconds
            }ms!`
          )
        }

        // loop delay
        if (!once) {
          loopLog.info(`Await for delay ${delay}s...`)
          await new Promise((resolve) => setTimeout(resolve, delay * 1000))
        }
      } while (!once)
      loopLog.warn('Running with --once, exiting after first loop!')
      process.exit()
    }
  )
  .parse()
