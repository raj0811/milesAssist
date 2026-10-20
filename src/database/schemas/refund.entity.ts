
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Check,
} from 'typeorm';

import { Transaction } from './transaction.entity';

export enum RefundStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SUCCESS = 'success',
    FAILED = 'failed',
}

@Entity('refunds')
@Index(['refundReference'], { unique: true })
@Index(['transactionId'])
@Index(['status', 'createdAt'])
@Check('"amount" > 0')
export class Refund {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    // Original payment
    @Column({ type: 'uuid' })
    transactionId!: string;

    @ManyToOne(() => Transaction, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'transactionId' })
    transaction!: Transaction;

    // Your internal refund reference
    @Column({ length: 50 })
    refundReference!: string;

    // Gateway refund ID/reference
    @Column({ type: 'varchar', length: 150, nullable: true })
    gatewayRefundId!: string | null;

    // ARN or other refund reference, when provided
    @Column({ type: 'varchar', length: 150, nullable: true })
    arn!: string | null;

    @Column({ type: 'numeric', precision: 14, scale: 2 })
    amount!: string;

    @Column({ length: 3, default: 'INR' })
    currency!: string;

    @Column({
        type: 'enum',
        enum: RefundStatus,
        default: RefundStatus.PENDING,
    })
    status!: RefundStatus;

    @Column({ type: 'timestamptz', nullable: true })
    initiatedAt!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    processedAt!: Date | null;

    @Column({ type: 'text', nullable: true })
    failureReason!: string | null;

    @Column({ type: 'text', nullable: true })
    notes!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
