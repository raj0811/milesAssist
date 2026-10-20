
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

export enum BookingStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum MeetingType {
    VIRTUAL = 'virtual',
    IN_PERSON = 'in_person',
}

@Entity('bookings')
@Index(['bookingReference'], { unique: true })
@Index(['userId'])
@Index(['status', 'scheduledAt'])
export class Booking {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    bookingReference!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @OneToMany(() => Transaction, (transaction) => transaction.booking)
    transactions!: Transaction[];

    @Column({ type: 'varchar', length: 150 })
    serviceName!: string;

    @Column({
        type: 'enum',
        enum: MeetingType,
        default: MeetingType.VIRTUAL,
    })
    meetingType!: MeetingType;

    @Column({ type: 'timestamptz' })
    scheduledAt!: Date;

    @Column({ type: 'int' })
    durationMinutes!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    meetingLocation!: string | null;

    @Column({ type: 'text', nullable: true })
    meetingUrl!: string | null;

    @Column({ type: 'text', nullable: true })
    specialNotes!: string | null;

    @Column({
        type: 'enum',
        enum: BookingStatus,
        default: BookingStatus.PENDING,
    })
    status!: BookingStatus;

    @Column({ type: 'numeric', precision: 12, scale: 2 })
    amount!: string;

    @Column({ type: 'varchar', length: 3, default: 'USD' })
    currency!: string;

    @Column({ type: 'timestamptz', nullable: true })
    confirmedAt!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    completedAt!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    cancelledAt!: Date | null;

    @Column({ type: 'text', nullable: true })
    cancellationReason!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
