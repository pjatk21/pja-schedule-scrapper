import { GroupDecoded, PJALevel, PJALocations, PJAMasterSubjects, PJAStudyMode } from "./types"

export class InvalidGroupCodeError extends Error {}

export class GroupCoder {
  private static readonly rule = /(?<lmk>[WGB][IGAZLK][szin]) ((?<lvl>I{1,3}|PD)\.(?<sem>\d)|(?<itn>ITN)) (-|(?<spec>(OB\.)?\w+)) (?<grp>\d+)(?<grpl>\w)/gm

  public static decode (groupString: string) {
    const { groups } = GroupCoder.rule.exec(groupString) || {}
    if (!groups) throw new InvalidGroupCodeError(`Invalid group code: ${groupString}`)
    const { lmk, lvl, sem, spec, grp, grpl, itn } = groups
    const groupObject: GroupDecoded = {
      location: lmk[0] as PJALocations,
      mainSubject: lmk[1] as PJAMasterSubjects,
      studyMode: lmk[2] as PJAStudyMode,
      level: lvl as PJALevel,
      semester: sem ? parseInt(sem) : undefined,
      itn: !!itn,
      specialization: spec,
      groupNumber: parseInt(grp),
      groupLetter: grpl
    }
    console.log({ ...groups }, groupObject)
    return groupObject
  }
}

GroupCoder.decode('WIs I.1 - 40c')
