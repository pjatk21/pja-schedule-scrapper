/* eslint-disable no-unused-vars */

export enum PJALocations {
  WARSAW = 'W',
  GDANSK = 'G',
  BYTOM = 'B',
}

export enum PJAMasterSubjects {
  IT = 'I',
  GRAPHICS = 'G',
  ARCHITECTURE = 'A',
  MANAGEMENT = 'Z',
  LECTURES = 'L',
  CULTURE = 'K',
}

export enum PJAStudyMode {
  SATIONARY = 's',
  EXTRAMURAL = 'n',
  INTERNET = 'i',
}

export enum PJALevel {
  FIRST = 'I',
  SECOND = 'II',
  THIRD = 'III',
  PD = 'PD',
}

/*
  examples: WIs I.5 A_BD 1w, WIs I.5 A_IO 1w, WGs II.1 OB.ZPGP1 11c, WZs I.ITN PIP 11c, WAs I.5 - 111l
  WIs - Warszawa Informatyka stacjonarnie
  I.5 - Pierwszy stopień, 5 semestr
  A_BD - Architektura Budowlana jako specjalizacja (brak specjalizacji to "-")
  OB.ZPGP1 - Obieralne
  11c - 11 grupa ćwiczeniowa
*/

// Regex for parsing groups: /(?<lmk>[WGB][IGAZLK][szin]) ((?<lvl>I{1,3}|PD)\.(?<sem>\d|ITN)) (?<mod>-|(OB\.)?\w+) (?<grp>\d+\w)/gm

export type GroupDecoded = {
  location: PJALocations
  mainSubject: PJAMasterSubjects
  studyMode: PJAStudyMode
  level?: PJALevel
  semester?: number
  itn?: boolean
  specialization?: string
  groupNumber?: number
  groupLetter?: string
  raw: string
}

export type CredentialsPair = {
  studentNumber: string
  password: string
}

/**
 * Includes settings (date, repeat timeouts etc.) for scraping schedule.
 */
export type ScheduleScrappingOptions = {
  /**
   * Date to fetch. If not set, current date is used.
   */
  dateString?: string
  /**
   * Repeat timed out requests. Defaults to true.
   */
  repeatTimeouts?: boolean
  /**
   * Maximum time to wait for a response. Defaults to 20000.
   */
  maxTimeout?: number
  limit?: number
  skip?: number
  filter?: (entry: {
    preview: string
    inlinePreview: string
    raw: any
    group?: GroupDecoded
  }) => boolean
}
