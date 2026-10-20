
import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import {
    PaymentMethod,
    TransactionStatus,
    TransactionType,
} from 'src/database/schemas/transaction.entity';

export class TransactionQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 8;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType;

    @IsOptional()
    @IsEnum(TransactionStatus)
    status?: TransactionStatus;

    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    // Presets for the UI date filter
    @IsOptional()
    @IsIn(['7d', '30d', '90d', 'all'])
    dateRange?: '7d' | '30d' | '90d' | 'all';

    @IsOptional()
    @IsIn(['all', 'under100', '100to1000', '1000to10000', 'over10000'])
    amountRange?: string;

    @IsOptional()
    @IsIn(['createdAt', 'amount', 'status'])
    sortBy: 'createdAt' | 'amount' | 'status' = 'createdAt';

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder: 'ASC' | 'DESC' = 'DESC';
}

export class CreateTransactionDto {
    @IsUUID()
    userId!: string;

    @IsOptional()
    @IsUUID()
    bookingId?: string;

    @IsEnum(TransactionType)
    type!: TransactionType;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(999999999999)
    amount!: number;

    @IsOptional()
    @IsString()
    @MaxLength(3)
    currency?: string;

    @IsEnum(PaymentMethod)
    paymentMethod!: PaymentMethod;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    gatewayName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    gatewayTransactionId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    gatewayReference?: string;

    @IsOptional()
    @IsObject()
    paymentDetails?: Record<string, string>;

    @IsOptional()
    @IsString()
    notes?: string;
}


export class UpdateTransactionStatusDto {
    @IsEnum(TransactionStatus)
    status!: TransactionStatus;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    failureReason?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}
