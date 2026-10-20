import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum AlertSeverity {
    INFO = 'info',
    WARNING = 'warning',
    CRITICAL = 'critical',
}

export enum AlertStatus {
    OPEN = 'open',
    ACKNOWLEDGED = 'acknowledged',
    RESOLVED = 'resolved',
}

@Entity('system_alerts')
@Index(['status', 'createdAt'])
@Index(['severity', 'status'])
export class SystemAlert {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 150 })
    title!: string;

    @Column({ type: 'text' })
    description!: string;

    @Column({
        type: 'enum',
        enum: AlertSeverity,
        default: AlertSeverity.INFO,
    })
    severity!: AlertSeverity;

    @Column({
        type: 'enum',
        enum: AlertStatus,
        default: AlertStatus.OPEN,
    })
    status!: AlertStatus;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt!: Date | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}