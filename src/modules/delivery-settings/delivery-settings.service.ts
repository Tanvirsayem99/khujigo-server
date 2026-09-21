import { Injectable } from '@nestjs/common';
import { DeliverySettings, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateDeliverySettingsDto } from './dto/update-delivery-settings.dto';

const SETTINGS_ID = 'default';
const FALLBACK = {
  estimatedDaysInsideDhaka: '1-2 Days',
  estimatedDaysOutsideDhaka: '2-4 Days',
} as const;

@Injectable()
export class DeliverySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reads the singleton settings row, creating it with defaults on first use so
   * checkout never fails on a fresh database.
   */
  async get(): Promise<DeliverySettings> {
    const existing = await this.prisma.deliverySettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (existing) return existing;

    return this.prisma.deliverySettings.create({
      data: { id: SETTINGS_ID, ...FALLBACK },
    });
  }

  async update(dto: UpdateDeliverySettingsDto): Promise<DeliverySettings> {
    await this.get();

    const data: Prisma.DeliverySettingsUpdateInput = {};
    if (dto.insideDhaka !== undefined) data.insideDhaka = dto.insideDhaka;
    if (dto.outsideDhaka !== undefined) data.outsideDhaka = dto.outsideDhaka;
    if (dto.freeDeliveryThreshold !== undefined) {
      data.freeDeliveryThreshold = dto.freeDeliveryThreshold;
    }
    if (dto.estimatedDaysInsideDhaka !== undefined) {
      data.estimatedDaysInsideDhaka = dto.estimatedDaysInsideDhaka;
    }
    if (dto.estimatedDaysOutsideDhaka !== undefined) {
      data.estimatedDaysOutsideDhaka = dto.estimatedDaysOutsideDhaka;
    }

    return this.prisma.deliverySettings.update({
      where: { id: SETTINGS_ID },
      data,
    });
  }

  /**
   * Delivery charge for a subtotal and destination. Mirrors the storefront rule:
   * free at or above the threshold, otherwise inside/outside Dhaka pricing.
   */
  chargeFor(
    settings: DeliverySettings,
    subtotal: number,
    division: string,
  ): number {
    if (subtotal >= settings.freeDeliveryThreshold) return 0;

    // Callers send the division as either its id ("dhaka") or its Bangla name
    // ("ঢাকা"); matching only the Latin form silently charged Dhaka customers
    // the outside-Dhaka rate.
    const normalized = division.trim().toLowerCase();
    const insideDhaka =
      normalized.includes('dhaka') || normalized.includes('ঢাকা');

    return insideDhaka ? settings.insideDhaka : settings.outsideDhaka;
  }
}
