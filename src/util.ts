import { JSDOM } from 'jsdom'

export function multiLinesIntoObject (input: string): Record<string, string> {
  const lines = input.split('\n')
  const result = Object()
  for (let i = 0; i < lines.length; i += 2) {
    const key = lines[i].replace(':', '')
    const val = lines[i + 1]
    if (val !== '---') result[key] = lines[i + 1]
    else result[key] = null
  }

  return result
}

export function serializeOutput (data: string) {
  const html = data.split('|')[7]
  const fragment = JSDOM.fragment(html) // just 7, just csv things

  if (!fragment.textContent) return

  const lines = fragment.textContent
    .replace(/(^\s+$| {2,})/gm, '')
    .replace(/\n+/gm, '\n')
    .trim()

  return multiLinesIntoObject(lines)
}
