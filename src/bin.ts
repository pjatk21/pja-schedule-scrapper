#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import ScheduleScrapper from './scrapper'
import { DateTime } from 'luxon'
import 'dotenv/config'
import pino from 'pino'
import { Uploader } from './uploader'

yargs(hideBin(process.argv))
  .options('api', {
    description:
      'Specify endpoint for uploading fetch results, can be set by env ALTAPI_URL',
    default: process.env.ALTAPI_URL ?? 'https://altapi.kpostek.dev/',
    type: 'string',
  })
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
        .option('limit', {
          description: 'Specify max size of fetched subjects',
          type: 'number',
        })
        .option('once', {
          description:
            'If set to true, runs loop only once, useful for benchmarking',
          type: 'boolean',
          default: false,
        })
        .option('dryRun', {
          description: "If set to true, then doesn't upload fetched entries.",
          type: 'boolean',
          default: false,
        })
    },
    async ({ api, delay, perf, offset, loopSize, once, limit, dryRun }) => {
      const loopLog = pino({
        name: 'Loop',
        transport: {
          target: 'pino-pretty',
        },
      })
      loopLog.info(
        { api, delay, perf, offset, loopSize, once, limit, dryRun },
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
          const result = await scrapper.fetchDay({ dateString: date, limit })
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

          if (!dryRun && result.errorRate < 0.01 && result.entries.length > 0) {
            const uploader = new Uploader(api)
            uploader.log = pino({
              name: `Uploader ${date}@${loopCount}`,
              transport: {
                target: 'pino-pretty',
              },
            })
            uploader.uploadEntries(result.entries, result.date)
          } else {
            loopLog.warn(
              {
                dryRun,
                errorRateExceeded: result.errorRate < 0.01,
                resultEmpty: result.entries.length > 0,
              },
              'Skipping upload'
            )
          }
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
