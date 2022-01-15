import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from 'typeorm'

@Entity()
export class ScheduleEntry extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @Column({ nullable: true })
    name?: string

  @Column({ nullable: true })
    code?: string

  @Column({ nullable: true })
    type?: string

  @Column({ nullable: true })
    groups?: string

  @Column({ nullable: true })
    building?: string

  @Column({ nullable: true })
    room?: string

  @Column()
    begin!: Date

  @Column()
    end!: Date

  @Column()
    dateString!: string

  @Column({ nullable: true })
    tutor?: string
}
