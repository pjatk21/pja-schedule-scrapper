export interface ScheduleEntry {
  name?: string
  code?: string
  type?: string
  groups?: string
  building?: string
  room?: string
  begin: Date
  end: Date
  dateString: string
  tutor?: string
}
