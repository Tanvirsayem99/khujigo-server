import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Admin, Customer, TokenSubject } from '@prisma/client';
import {
  AdminSummary,
  toAdminSummary,
} from '../../common/interfaces/admin-summary.interface';
import { JwtPayload } from '../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../common/prisma/prisma.service';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import { hashToken, newTokenId } from '../../common/utils/token.util';
import { AuthTokensDto } from './dto/auth-response.dto';
import { LoginAdminDto } from './dto/admin-auth.dto';
import {
  LoginCustomerDto,
  RegisterCustomerDto,
  UpdateCustomerProfileDto,
} from './dto/customer-auth.dto';

export interface PublicCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  division: string | null;
  district: string | null;
  area: string | null;
  address: string | null;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------- customers

  async registerCustomer(dto: RegisterCustomerDto): Promise<AuthTokensDto> {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    const existing = await this.prisma.customer.findFirst({
      where: { OR: [{ email }, { phone }] },
      select: { email: true, phone: true },
    });
    if (existing) {
      throw new ConflictException(
        'An account already exists with this email or phone number',
      );
    }

    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name.trim(),
        email,
        phone,
        passwordHash: await hashPassword(dto.password),
        division: dto.division ?? null,
        district: dto.district ?? null,
        area: dto.area ?? null,
        address: dto.address ?? null,
      },
    });

    return this.issueTokens(customer, TokenSubject.CUSTOMER);
  }

  async loginCustomer(dto: LoginCustomerDto): Promise<AuthTokensDto> {
    const raw = dto.identifier.trim();
    const customer = await this.prisma.customer.findFirst({
      where: { OR: [{ email: raw.toLowerCase() }, { phone: raw }] },
    });

    // Always run a verification so a missing account and a wrong password
    // take a similar amount of time.
    const passwordOk = customer
      ? await verifyPassword(dto.password, customer.passwordHash)
      : await this.consumeTime(dto.password);

    if (!customer || !passwordOk) {
      throw new UnauthorizedException('Email/phone or password is incorrect');
    }

    return this.issueTokens(customer, TokenSubject.CUSTOMER);
  }

  async getCustomerProfile(id: string): Promise<PublicCustomer> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new UnauthorizedException('Account no longer exists');
    return this.toPublicCustomer(customer);
  }

  async updateCustomerProfile(
    id: string,
    dto: UpdateCustomerProfileDto,
  ): Promise<PublicCustomer> {
    const data: Partial<Customer> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.division !== undefined) data.division = dto.division;
    if (dto.district !== undefined) data.district = dto.district;
    if (dto.area !== undefined) data.area = dto.area;
    if (dto.address !== undefined) data.address = dto.address;

    const updated = await this.prisma.customer.update({ where: { id }, data });
    return this.toPublicCustomer(updated);
  }

  // ------------------------------------------------------------------- admins

  async loginAdmin(dto: LoginAdminDto): Promise<AuthTokensDto> {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    const passwordOk = admin
      ? await verifyPassword(dto.password, admin.passwordHash)
      : await this.consumeTime(dto.password);

    if (!admin || !passwordOk) {
      throw new UnauthorizedException(
        'Invalid admin credentials or unauthorized account',
      );
    }

    return this.issueTokens(admin, TokenSubject.ADMIN);
  }

  async getAdminProfile(id: string): Promise<AdminSummary> {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new UnauthorizedException('Account no longer exists');
    return toAdminSummary(admin);
  }

  // ------------------------------------------------------------------- tokens

  /**
   * Verifies a refresh token, revokes it, and issues a fresh pair (rotation).
   * The user is re-read from the DB so role changes take effect on refresh.
   */
  async refresh(
    refreshToken: string,
    expectedType: TokenSubject,
  ): Promise<AuthTokensDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== expectedType) {
      throw new ForbiddenException(
        `This endpoint requires a ${expectedType.toLowerCase()} refresh token`,
      );
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!record || record.revokedAt || record.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    if (expectedType === TokenSubject.CUSTOMER) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: payload.sub },
      });
      if (!customer)
        throw new UnauthorizedException('Account no longer exists');
      return this.issueTokens(customer, TokenSubject.CUSTOMER);
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });
    if (!admin) throw new UnauthorizedException('Account no longer exists');
    return this.issueTokens(admin, TokenSubject.ADMIN);
  }

  /** Revokes a refresh token. Idempotent — safe to call with a stale token. */
  async logout(refreshToken: string): Promise<{ success: true }> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private async issueTokens(
    subject: Customer | Admin,
    type: TokenSubject,
  ): Promise<AuthTokensDto> {
    const email = subject.email;
    const role = 'role' in subject ? subject.role : undefined;

    const payload: JwtPayload = {
      sub: subject.id,
      type,
      email,
      ...(role ? { role } : {}),
    };

    const accessTtl = this.config.get<string>('jwt.accessTtl') ?? '15m';
    const refreshTtl = this.config.get<string>('jwt.refreshTtl') ?? '30d';
    const ttl = (value: string) => value as JwtSignOptions['expiresIn'];

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: ttl(accessTtl),
    });

    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: newTokenId() },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: ttl(refreshTtl),
      },
    );

    const decoded = this.jwt.decode(refreshToken) as { exp: number } | null;
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        subject: type,
        subjectId: subject.id,
        expiresAt: new Date((decoded?.exp ?? 0) * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      tokenType: type,
      user:
        type === TokenSubject.CUSTOMER
          ? this.toPublicCustomer(subject as Customer)
          : toAdminSummary(subject as Admin),
    };
  }

  /** Constant-ish work for the "user not found" path. */
  private async consumeTime(password: string): Promise<false> {
    await hashPassword(password);
    return false;
  }

  private toPublicCustomer(customer: Customer): PublicCustomer {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      division: customer.division,
      district: customer.district,
      area: customer.area,
      address: customer.address,
      createdAt: customer.createdAt,
    };
  }
}
