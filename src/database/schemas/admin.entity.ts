
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminRole } from 'src/dto/user.dto';

@Entity('admins')
export class Admin {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 100 })
    name!: string;

    @Column({ unique: true, length: 255 })
    email!: string;

    @Column({ name: 'password_hash', select: false })
    passwordHash!: string;

    @Column({ default: true })
    isActive!: boolean;

    @Column({
        type: 'enum',
        enum: AdminRole,
        default: AdminRole.ADMIN,
    })
    role!: AdminRole;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword(): Promise<void> {
        if (this.passwordHash) {
            this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
        }
    }
}
