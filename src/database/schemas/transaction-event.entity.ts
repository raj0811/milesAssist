
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';

import { Transaction } from './transaction.entity';

@Entity('transaction_events')
@Index(['transactionId', 'createdAt'])
export class TransactionEvent {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    transactionId!: string;

    @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'transactionId' })
    transaction!: Transaction;

    @Column({ length: 100 })
    eventType!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    reference!: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: Record<string, unknown> | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
