import got, {Response} from 'got'
import { readFile } from 'fs/promises'
import { remapObjects, serializeOutput } from "./util";

async function main() {
  const requests: { headers: Record<string, string>; body: string }[] =
    JSON.parse((await readFile('result.json')).toString())
  console.log(requests.length)

  const responses: Response<string>[] = await Promise.all(requests.map(r => {
    return got.post('https://planzajec.pjwstk.edu.pl/PlanOgolny3.aspx', {
      body: r.body,
      headers: r.headers,
    })
  }))

  // const objects = responses.map(r => remapObjects(serializeOutput(r.body)!))
  return responses.map(r => remapObjects(serializeOutput(r.body)!))
}

main().then(a => console.log(a))
