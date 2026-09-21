import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({
    description: 'Short-lived JWT to send as `Authorization: Bearer <token>`',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Long-lived rotating token used only against /auth/*/refresh',
  })
  refreshToken!: string;

  @ApiProperty({ example: '15m' })
  expiresIn!: string;

  @ApiProperty({ enum: ['CUSTOMER', 'ADMIN'] })
  tokenType!: string;

  @ApiProperty({
    type: Object,
    description: 'The authenticated profile (customer or admin)',
  })
  user!: object;
}
