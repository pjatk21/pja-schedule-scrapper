# PJA schedule scrapper

## Install
```shell
yarn add https://github.com/pjatk21/pja-scrapper.git
# or
npm i pja-scrapper
```

## What's in the box?
 - Scrapper

## Why?
 - There isn't any API access for schedule, because someone DDOSed old API and now it's gone :(

## Example

```ts
import { Scrapper } from 'pja-scrapper'

async function testFetch () {
  const browser = await puppeteer.launch({
    headless: true
  })
  const scrapper = new Scrapper(browser)
  const result = await scrapper.fetchDay({ dateString: '2022-01-24' })
  console.log(result)
}

testFetch().then(() => process.exit(0))

```

## FAQ
 - Script is running so slow on windows in headless mode: disable windows defender
 - Timeout warnings: ignore them, those requests will by retried on the end. You can still increase `maxTimeout`.
 - Is it possible to speed up script?: lower `maxTimeout` 
