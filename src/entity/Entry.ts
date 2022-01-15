import { Entity, Column, BaseEntity } from 'typeorm'

@Entity()
export class Entry extends BaseEntity {
  @Column()
    name?: string

  @Column()
    code: string

  @Column()
    type: string

  @Column()
    groups?: string

  @Column()
    building?: string

  @Column()
    room?: string

  @Column()
    begin: Date

  @Column()
    end: Date

  @Column()
    tutor?: string
}

@Entity()
export class Photo {
    @Column()
      id: number

    @Column()
      name: string

    @Column()
      description: string

    @Column()
      filename: string

    @Column()
      views: number

    @Column()
      isPublished: boolean
}
