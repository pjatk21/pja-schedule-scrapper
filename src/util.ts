import { JSDOM } from 'jsdom'
import moment from 'moment'

export interface ScheduleEntry {
  name?: string
  code: string
  type: string
  groups?: string
  building?: string
  room?: string
  begin: Date
  end: Date
}

export function multilinesIntoObject(input: string): Record<string, string> {
  const lines = input.split('\n')
  const result = Object()
  for (let i = 0; i < lines.length; i += 2) {
    const key = lines[i].replace(':', ''),
      val = lines[i + 1]
    if (val !== '---') result[key] = lines[i + 1]
    else result[key] = null
  }

  return result
}

export function serializeOutput(data: string) {
  const html = data.split('|')[7]
  const fragment = JSDOM.fragment(html) // just 7, just csv things

  if (!fragment.textContent) return

  const lines = fragment.textContent
    .replace(RegExp('(^\\s+$| {2,})', 'gm'), '')
    .replace(RegExp('\\n+', 'gm'), '\n')
    .trim()

  return multilinesIntoObject(lines)
}

export function remapObjects(obj: Record<string, string>): ScheduleEntry {
  const begin = moment(`${obj['Data zajęć']} ${obj['Godz. rozpoczęcia']}`, 'DD.MM.YYYY HH:mm:ss').toDate()
  const end = moment(`${obj['Data zajęć']} ${obj['Godz. zakończenia']}`, 'DD.MM.YYYY HH:mm:ss').toDate()
  return {
    type: obj['Typ zajęć'],
    code: obj['Kody przedmiotów'],
    name: obj['Nazwy przedmiotów'],
    begin,
    end,
  }
}
