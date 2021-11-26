export function multilinesIntoObject(input: string): Record<string, string> {
  const lines = input.split('\n')
  const result = Object()
  for (let i = 0; i < lines.length; i += 2) {
    const key = lines[i].replace(':', ''), val = lines[i + 1]
    if (val !== '---')
      result[key] = lines[i + 1]
    else
      result[key] = null
  }

  return result
}
