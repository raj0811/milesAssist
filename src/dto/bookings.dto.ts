
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MeetingType } from 'src/database/schemas/booking.entity';

export class CreateBookingDto {
    @IsUUID()
    userId!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    serviceName!: string;

    @IsEnum(MeetingType)
    meetingType!: MeetingType;

    @IsDateString()
    scheduledAt!: string;

    @Type(() => Number)
    @IsInt()
    @Min(15)
    @Max(480)
    durationMinutes!: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    meetingLocation?: string;

    @IsOptional()
    @IsString()
    meetingUrl?: string;

    @IsOptional()
    @IsString()
    specialNotes?: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    amount!: number;

    @IsOptional()
    @IsString()
    @MaxLength(3)
    currency?: string;
}


export class RescheduleBookingDto {
    @IsDateString()
    scheduledAt!: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(15)
    @Max(480)
    durationMinutes?: number;

    @IsOptional()
    @IsEnum(MeetingType)
    meetingType?: MeetingType;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    meetingLocation?: string | null;

    @IsOptional()
    @IsString()
    meetingUrl?: string | null;

    @IsOptional()
    @IsString()
    specialNotes?: string | null;
}

export class CancelBookingDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    cancellationReason?: string;
}