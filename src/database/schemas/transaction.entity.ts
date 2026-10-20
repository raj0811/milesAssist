
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from './user.entity';

export enum TransactionType {
    PAYMENT = 'payment',
    REFUND = 'refund',
    TRANSFER = 'transfer',
}

export enum TransactionStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export enum PaymentMethod {
    UPI = 'upi',
    CREDIT_CARD = 'credit_card',
    DEBIT_CARD = 'debit_card',
    NET_BANKING = 'net_banking',
    WALLET = 'wallet',
    BANK_TRANSFER = 'bank_transfer',
    OTHER = 'other',
}

export enum SettlementStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SETTLED = 'settled',
    FAILED = 'failed',
}

@Entity('transactions')
@Index(['transactionReference'], { unique: true })
@Index(['userId'])
@Index(['status', 'createdAt'])
@Index(['gatewayName', 'gatewayTransactionId'])
@Index(['settlementStatus', 'settledAt'])
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    // Basic transaction details
    @Column({ type: 'varchar', length: 50, unique: true })
    transactionReference!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({
        type: 'enum',
        enum: TransactionType,
    })
    type!: TransactionType;

    @Column({ type: 'numeric', precision: 14, scale: 2 })
    amount!: string;

    @Column({ type: 'varchar', length: 3, default: 'INR' })
    currency!: string;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
    })
    status!: TransactionStatus;

    // Payment lifecycle
    @Column({ type: 'timestamptz', nullable: true })
    initiatedAt!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    paidAt!: Date | null;

    @Column({ type: 'text', nullable: true })
    failureReason!: string | null;

    // Payment gateway
    @Column({ type: 'varchar', length: 50, nullable: true })
    gatewayName!: string | null;

    @Column({ type: 'varchar', length: 150, nullable: true })
    gatewayTransactionId!: string | null;

    @Column({ type: 'varchar', length: 150, nullable: true })
    gatewayReference!: string | null;

    // Payment method and method-specific details
    @Column({
        type: 'enum',
        enum: PaymentMethod,
        nullable: true,
    })
    paymentMethod!: PaymentMethod | null;

    @Column({ type: 'jsonb', nullable: true })
    paymentDetails!: Record<string, string> | null;

    // Settlement information
    @Column({
        type: 'enum',
        enum: SettlementStatus,
        default: SettlementStatus.PENDING,
    })
    settlementStatus!: SettlementStatus;

    @Column({ type: 'timestamptz', nullable: true })
    settledAt!: Date | null;

    @Column({ type: 'varchar', length: 150, nullable: true })
    settlementUtr!: string | null;

    @Column({
        type: 'numeric',
        precision: 14,
        scale: 2,
        nullable: true,
    })
    settledAmount!: string | null;

    // Notes
    @Column({ type: 'text', nullable: true })
    notes!: string | null;

    // Optional link to the original transaction
    // Useful when a refund is represented as a transaction row.
    @Column({ type: 'uuid', nullable: true })
    originalTransactionId!: string | null;

    @ManyToOne(() => Transaction, {
        nullable: true,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'originalTransactionId' })
    originalTransaction!: Transaction | null;

    @Column({ type: 'uuid', nullable: true })
    bookingId!: string | null;

    @ManyToOne(
        () => Booking,
        { nullable: true, onDelete: 'SET NULL' },
    )
    @JoinColumn({ name: 'bookingId' })
    booking!: Booking | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
