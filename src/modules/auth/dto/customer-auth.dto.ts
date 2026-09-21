import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Bangladeshi mobile number: 11 digits starting 013–019. */
export const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

export class RegisterCustomerDto {
  @ApiProperty({ example: 'Zubair Hossain' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'zubair@example.com' })
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toLowerCase(),
  )
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '01712345678' })
  @Transform(({ value }) => String(value ?? '').trim())
  @Matches(BD_PHONE_REGEX, {
    message: 'phone must be a valid 11-digit Bangladeshi mobile number',
  })
  phone!: string;

  @ApiProperty({ example: 'customer123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({ example: 'dhaka' })
  @IsOptional()
  @IsString()
  division?: string;

  @ApiPropertyOptional({ example: 'dhaka-city' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 'Dhanmondi' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({
    example: 'House #45, Road #7/A, Dhanmondi R/A, Dhaka',
  })
  @IsOptional()
  @IsString()
  address?: string;
}

export class LoginCustomerDto {
  @ApiProperty({
    description: 'Email address or 11-digit mobile number',
    example: 'customer@khujigo.com',
  })
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  identifier!: string;

  @ApiProperty({ example: 'customer123' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toLowerCase(),
  )
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim())
  @Matches(BD_PHONE_REGEX, {
    message: 'phone must be a valid 11-digit Bangladeshi mobile number',
  })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  division?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token issued at login' })
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
