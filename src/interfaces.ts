import { GroupDecoded } from './types'

export interface ScheduleEntry {
  name?: string
  code?: string
  type?: string
  groups?: GroupDecoded[]
  building?: string
  room?: string
  begin: Date
  end: Date
  dateString: string
  tutor?: string
}
