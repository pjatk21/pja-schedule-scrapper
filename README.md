# PJA schedule scrapper

## Install
```shell
yarn add https://github.com/pjatk21/pja-schedule-scrapper.git
# or
npm i pja-scrapper
```

## What's in the box?
 - Scrapper

## Why?
 - There isn't any API access for schedule, because someone DDOSed old API and now it's gone :(

## Example

```ts
import { fetchDay, fetchDays } from 'pja-scrapper'

(async () => {
  const a = await fetchDay('2022-01-17')
  const [b, c] = await fetchDays(['2022-01-18', '2022-01-19'])

  console.log(a, b, c)
})().then(() => process.exit())
```

## FAQ
 - Script is running so slow on windows in headless mode: disable windows defender
