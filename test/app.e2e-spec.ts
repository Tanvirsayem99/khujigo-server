import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server as HttpServer } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * End-to-end suite. Requires a migrated + seeded database (npm run db:setup
 * against a test DATABASE_URL).
 */
describe('KhujiGo API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: HttpServer;

  const customerCredentials = {
    identifier: 'customer@khujigo.com',
    password: 'customer123',
  };
  const adminCredentials = {
    email: 'admin@khujigo.com',
    password: 'admin123',
  };

  let customerToken: string;
  let adminToken: string;

  const api = () => request(server);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    server = app.getHttpServer() as HttpServer;

    const customerLogin = await api()
      .post('/api/v1/auth/customer/login')
      .send(customerCredentials)
      .expect(200);
    customerToken = customerLogin.body.accessToken;

    const adminLogin = await api()
      .post('/api/v1/auth/admin/login')
      .send(adminCredentials)
      .expect(200);
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('health', () => {
    it('reports the database as reachable', async () => {
      const res = await api().get('/api/v1/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('up');
    });
  });

  describe('catalog', () => {
    it('paginates products', async () => {
      const res = await api()
        .get('/api/v1/products?page=1&limit=4')
        .expect(200);

      expect(res.body.items).toHaveLength(4);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(4);
      expect(res.body.total).toBeGreaterThanOrEqual(8);
      expect(res.body.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('searches and sorts by price ascending', async () => {
      const res = await api()
        .get('/api/v1/products?search=watch&sort=price_asc')
        .expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      const prices = res.body.items.map((p: { price: number }) => p.price);
      expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    });

    it('filters by category slug', async () => {
      const res = await api()
        .get('/api/v1/products?categorySlug=gadgets')
        .expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      for (const item of res.body.items) {
        expect(item.category.slug).toBe('gadgets');
      }
    });

    it('only returns discounted products when onSale=true', async () => {
      const res = await api().get('/api/v1/products?onSale=true').expect(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      for (const item of res.body.items) {
        expect(item.discountPercent).toBeGreaterThan(0);
      }
    });

    it('rejects unknown query parameters', async () => {
      await api().get('/api/v1/products?bogus=1').expect(400);
    });

    it('fetches a product by slug', async () => {
      const res = await api()
        .get('/api/v1/products/t900-ultra-2-smartwatch-bangla-support')
        .expect(200);

      expect(res.body.sku).toBe('KG-WAT-001');
      expect(res.body.category.slug).toBe('gadgets');
      expect(Array.isArray(res.body.specifications)).toBe(true);
    });

    it('404s for an unknown product', async () => {
      await api().get('/api/v1/products/not-a-real-product').expect(404);
    });

    it('returns related products from the same category', async () => {
      const res = await api()
        .get('/api/v1/products/prod-1/related?limit=3')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      for (const item of res.body) {
        expect(item.categoryId).toBe('cat-gadgets');
        expect(item.id).not.toBe('prod-1');
      }
    });

    it('hides DRAFT products from the storefront but not from admins', async () => {
      const suffix = Date.now();
      const draft = await prisma.product.create({
        data: {
          nameEn: 'E2E Draft Product',
          nameBn: 'ই২ই ড্রাফট',
          slug: `e2e-draft-${suffix}`,
          sku: `KG-DRAFT-${suffix}`,
          categoryId: 'cat-gadgets',
          brand: 'E2E',
          shortDescEn: 'draft',
          shortDescBn: 'draft',
          descriptionEn: 'draft',
          descriptionBn: 'draft',
          price: 100,
          stockQuantity: 1,
          thumbnailUrl: 'https://picsum.photos/seed/e2e/400/400',
          status: 'DRAFT',
        },
      });

      // Not reachable by slug on the storefront…
      await api().get(`/api/v1/products/${draft.slug}`).expect(404);

      // …nor present in the public listing, even when searched by unique SKU.
      const found = await api()
        .get(`/api/v1/products?search=${draft.sku}`)
        .expect(200);
      expect(found.body.items).toHaveLength(0);

      // Admins do see it.
      const adminList = await api()
        .get(`/api/v1/products/admin/all?search=${draft.sku}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(adminList.body.items).toHaveLength(1);

      await prisma.product.delete({ where: { id: draft.id } });
    });
  });

  describe('auth & RBAC', () => {
    it('401s without a token', async () => {
      await api().get('/api/v1/auth/customer/me').expect(401);
    });

    it('401s with a garbage token', async () => {
      await api()
        .get('/api/v1/auth/customer/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });

    it('returns the customer profile with a customer token', async () => {
      const res = await api()
        .get('/api/v1/auth/customer/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.email).toBe('customer@khujigo.com');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('403s a customer token on an admin-only route', async () => {
      await api()
        .get('/api/v1/analytics')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('403s an admin token on a customer-only route', async () => {
      await api()
        .get('/api/v1/auth/customer/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('401s on bad credentials rather than revealing which part was wrong', async () => {
      await api()
        .post('/api/v1/auth/customer/login')
        .send({
          identifier: 'customer@khujigo.com',
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('lets admins read analytics', async () => {
      const res = await api()
        .get('/api/v1/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(typeof res.body.totalSales).toBe('number');
      expect(typeof res.body.lowStockCount).toBe('number');
      expect(typeof res.body.averageOrderValue).toBe('number');
    });

    it('rotates a refresh token and rejects the old one afterwards', async () => {
      const login = await api()
        .post('/api/v1/auth/customer/login')
        .send(customerCredentials)
        .expect(200);

      const rotated = await api()
        .post('/api/v1/auth/customer/refresh')
        .send({ refreshToken: login.body.refreshToken })
        .expect(200);
      expect(rotated.body.accessToken).toBeDefined();

      await api()
        .post('/api/v1/auth/customer/refresh')
        .send({ refreshToken: login.body.refreshToken })
        .expect(401);
    });

    it('restricts category deletion to super admins', async () => {
      const staffLogin = await api()
        .post('/api/v1/auth/admin/login')
        .send({ email: 'staff@khujigo.com', password: 'staff123' })
        .expect(200);

      await api()
        .delete('/api/v1/categories/cat-beauty')
        .set('Authorization', `Bearer ${staffLogin.body.accessToken}`)
        .expect(403);
    });
  });

  describe('coupons', () => {
    it('applies a fixed discount', async () => {
      const res = await api()
        .post('/api/v1/coupons/validate')
        .send({ code: 'KHUJIGO100', subtotal: 2300 })
        .expect(200);

      expect(res.body).toMatchObject({ valid: true, discount: 100 });
    });

    it('caps a percentage discount at maxDiscountAmount', async () => {
      // Created on the fly so the assertion never depends on the seeded dates.
      const code = `E2ECAP${Date.now()}`;
      const created = await api()
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minOrderAmount: 0,
          maxDiscountAmount: 300,
          usageLimit: 10,
          startDate: new Date(Date.now() - 86_400_000).toISOString(),
          expiryDate: new Date(Date.now() + 86_400_000).toISOString(),
          isActive: true,
        })
        .expect(201);

      // 10% of 9000 is 900, which the cap reduces to 300.
      const res = await api()
        .post('/api/v1/coupons/validate')
        .send({ code, subtotal: 9000 })
        .expect(200);
      expect(res.body.discount).toBe(300);

      await api()
        .delete(`/api/v1/coupons/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('rejects an expired coupon', async () => {
      // The seeded EID2026 coupon expired on 2026-04-30; the old client never
      // checked the validity window, so it kept working.
      const res = await api()
        .post('/api/v1/coupons/validate')
        .send({ code: 'EID2026', subtotal: 5000 })
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toBe('EXPIRED');
      expect(res.body.message).toMatch(/expired/i);
    });

    it('rejects a coupon below its minimum order amount', async () => {
      const res = await api()
        .post('/api/v1/coupons/validate')
        .send({ code: 'KHUJIGO100', subtotal: 500 })
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toBe('MIN_ORDER');
    });

    it('rejects an unknown coupon', async () => {
      const res = await api()
        .post('/api/v1/coupons/validate')
        .send({ code: 'NOPE-NOT-A-COUPON', subtotal: 5000 })
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toBe('INVALID');
    });
  });

  describe('checkout', () => {
    const shipping = {
      customerName: 'E2E Buyer',
      customerPhone: '01711111111',
      division: 'dhaka',
      district: 'dhaka-city',
      area: 'Mirpur',
      fullAddress: 'House 1, Road 1, Mirpur, Dhaka',
      paymentMethod: 'COD',
    };

    it('creates an order, decrements stock and counts the coupon redemption', async () => {
      const before = await prisma.product.findUniqueOrThrow({
        where: { id: 'prod-4' },
      });
      const couponBefore = await prisma.coupon.findUniqueOrThrow({
        where: { code: 'TRENDING50' },
      });

      const res = await api()
        .post('/api/v1/orders')
        .send({
          ...shipping,
          couponCode: 'TRENDING50',
          items: [{ productId: 'prod-4', quantity: 2 }],
        })
        .expect(201);

      expect(res.body.id).toMatch(/^KG-\d{4}-\d{4}$/);
      expect(res.body.subtotal).toBe(before.price * 2);
      // Inside Dhaka and under the free-delivery threshold.
      expect(res.body.deliveryCharge).toBe(60);
      expect(res.body.discount).toBe(50);
      expect(res.body.totalAmount).toBe(before.price * 2 + 60 - 50);
      expect(res.body.orderStatus).toBe('PENDING');
      expect(res.body.paymentStatus).toBe('UNPAID');

      const after = await prisma.product.findUniqueOrThrow({
        where: { id: 'prod-4' },
      });
      expect(after.stockQuantity).toBe(before.stockQuantity - 2);

      const couponAfter = await prisma.coupon.findUniqueOrThrow({
        where: { code: 'TRENDING50' },
      });
      expect(couponAfter.usedCount).toBe(couponBefore.usedCount + 1);
    });

    it('gives free delivery at or above the threshold', async () => {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: 'prod-1' },
      });

      const res = await api()
        .post('/api/v1/orders')
        .send({
          ...shipping,
          items: [{ productId: 'prod-1', quantity: 2 }],
        })
        .expect(201);

      expect(res.body.subtotal).toBe(product.price * 2);
      expect(res.body.subtotal).toBeGreaterThanOrEqual(2500);
      expect(res.body.deliveryCharge).toBe(0);
    });

    it('charges the inside-Dhaka rate when the division is the Bangla name', async () => {
      // The storefront sends the localised division ("ঢাকা"). Matching only the
      // Latin "dhaka" silently charged Dhaka customers the outside rate.
      const res = await api()
        .post('/api/v1/orders')
        .send({
          ...shipping,
          division: 'ঢাকা',
          district: 'ঢাকা',
          items: [{ productId: 'prod-3', quantity: 1 }],
        })
        .expect(201);

      expect(res.body.subtotal).toBeLessThan(2500);
      expect(res.body.deliveryCharge).toBe(60);
    });

    it('prices from the database and ignores client-supplied amounts', async () => {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: 'prod-3' },
      });

      // `totalAmount` is not part of the contract, so it is rejected outright.
      await api()
        .post('/api/v1/orders')
        .send({
          ...shipping,
          totalAmount: 1,
          items: [{ productId: 'prod-3', quantity: 1 }],
        })
        .expect(400);

      const res = await api()
        .post('/api/v1/orders')
        .send({ ...shipping, items: [{ productId: 'prod-3', quantity: 1 }] })
        .expect(201);

      expect(res.body.subtotal).toBe(product.price);
    });

    it('rejects a quantity above available stock', async () => {
      await api()
        .post('/api/v1/orders')
        .send({
          ...shipping,
          items: [{ productId: 'prod-4', quantity: 999999 }],
        })
        .expect(409);
    });

    it('rejects an unknown product', async () => {
      await api()
        .post('/api/v1/orders')
        .send({
          ...shipping,
          items: [{ productId: 'prod-does-not-exist', quantity: 1 }],
        })
        .expect(404);
    });

    it('rejects an invalid Bangladeshi phone number', async () => {
      await api()
        .post('/api/v1/orders')
        .send({
          ...shipping,
          customerPhone: '12345',
          items: [{ productId: 'prod-3', quantity: 1 }],
        })
        .expect(400);
    });

    it('rejects an invalid coupon instead of silently ignoring it', async () => {
      const res = await api()
        .post('/api/v1/orders')
        .send({
          ...shipping,
          couponCode: 'TOTALLY-FAKE',
          items: [{ productId: 'prod-3', quantity: 1 }],
        })
        .expect(400);

      // The reason code lets the storefront localise the message.
      expect(res.body.reason).toBe('INVALID');
    });

    it('exposes a receipt by order id and links it to the customer', async () => {
      const created = await api()
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ...shipping,
          customerEmail: 'customer@khujigo.com',
          customerPhone: '01712345678',
          items: [{ productId: 'prod-3', quantity: 1 }],
        })
        .expect(201);

      const receipt = await api()
        .get(`/api/v1/orders/${created.body.id}`)
        .expect(200);
      expect(receipt.body.items).toHaveLength(1);

      const mine = await api()
        .get('/api/v1/orders/mine?limit=100')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const ids = mine.body.items.map((o: { id: string }) => o.id);
      expect(ids).toContain(created.body.id);
    });

    it('lets staff advance the order status and payment status', async () => {
      const staffLogin = await api()
        .post('/api/v1/auth/admin/login')
        .send({ email: 'staff@khujigo.com', password: 'staff123' })
        .expect(200);
      const staffToken = staffLogin.body.accessToken;

      const created = await api()
        .post('/api/v1/orders')
        .send({ ...shipping, items: [{ productId: 'prod-3', quantity: 1 }] })
        .expect(201);

      const updated = await api()
        .patch(`/api/v1/orders/${created.body.id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      expect(updated.body.orderStatus).toBe('CONFIRMED');

      const paid = await api()
        .patch(`/api/v1/orders/${created.body.id}/payment-status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ paymentStatus: 'PAID' })
        .expect(200);
      expect(paid.body.paymentStatus).toBe('PAID');
    });

    it('blocks anonymous callers from the admin order list', async () => {
      await api().get('/api/v1/orders').expect(401);
    });

    it('only lets admins delete cancelled orders, removing them from the database', async () => {
      const created = await api()
        .post('/api/v1/orders')
        .send({ ...shipping, items: [{ productId: 'prod-3', quantity: 1 }] })
        .expect(201);

      // A live order cannot be deleted.
      await api()
        .delete(`/api/v1/orders/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      // Cancel it first.
      await api()
        .patch(`/api/v1/orders/${created.body.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      // Staff cannot delete even a cancelled order.
      const staffLogin = await api()
        .post('/api/v1/auth/admin/login')
        .send({ email: 'staff@khujigo.com', password: 'staff123' })
        .expect(200);
      await api()
        .delete(`/api/v1/orders/${created.body.id}`)
        .set('Authorization', `Bearer ${staffLogin.body.accessToken}`)
        .expect(403);

      // Anonymous callers are rejected outright.
      await api().delete(`/api/v1/orders/${created.body.id}`).expect(401);

      // A full admin deletes it for good.
      await api()
        .delete(`/api/v1/orders/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // The receipt is gone and the row (and its items) are gone from the DB.
      await api().get(`/api/v1/orders/${created.body.id}`).expect(404);
      expect(
        await prisma.order.findUnique({ where: { id: created.body.id } }),
      ).toBeNull();
      expect(
        await prisma.orderItem.count({ where: { orderId: created.body.id } }),
      ).toBe(0);
    });
  });

  describe('reviews', () => {
    it('only exposes approved reviews publicly', async () => {
      const res = await api()
        .get('/api/v1/reviews?productId=prod-1')
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      for (const review of res.body) {
        expect(review.status).toBe('APPROVED');
      }
    });

    it('queues a new review for moderation', async () => {
      const before = await api()
        .get('/api/v1/reviews?productId=prod-3')
        .expect(200);

      const created = await api()
        .post('/api/v1/reviews')
        .send({
          productId: 'prod-3',
          customerName: 'E2E Reviewer',
          rating: 4,
          comment: 'Solid earbuds for the price.',
        })
        .expect(201);

      expect(created.body.status).toBe('PENDING');
      expect(created.body.productName).toBeTruthy();

      const after = await api()
        .get('/api/v1/reviews?productId=prod-3')
        .expect(200);
      expect(after.body).toHaveLength(before.body.length);

      const approved = await api()
        .patch(`/api/v1/reviews/${created.body.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' })
        .expect(200);
      expect(approved.body.status).toBe('APPROVED');

      const visible = await api()
        .get('/api/v1/reviews?productId=prod-3')
        .expect(200);
      expect(visible.body).toHaveLength(before.body.length + 1);

      await api()
        .delete(`/api/v1/reviews/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('admin catalog writes', () => {
    it('creates, updates and deletes a product', async () => {
      const slug = `e2e-product-${Date.now()}`;
      const created = await api()
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nameEn: 'E2E Product',
          nameBn: 'ই২ই পণ্য',
          slug,
          sku: `KG-E2E-${Date.now()}`,
          categoryId: 'cat-accessories',
          brand: 'E2E',
          shortDescEn: 'short',
          shortDescBn: 'short',
          descriptionEn: 'long',
          descriptionBn: 'long',
          price: 500,
          stockQuantity: 5,
          thumbnailUrl: 'https://picsum.photos/seed/e2eprod/400/400',
          tags: ['e2e'],
          specifications: [
            { keyEn: 'Colour', keyBn: 'রং', valueEn: 'Black', valueBn: 'কালো' },
          ],
        })
        .expect(201);

      expect(created.body.slug).toBe(slug);

      const stocked = await api()
        .patch(`/api/v1/products/${created.body.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: 42 })
        .expect(200);
      expect(stocked.body.stockQuantity).toBe(42);

      const updated = await api()
        .patch(`/api/v1/products/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 750 })
        .expect(200);
      expect(updated.body.price).toBe(750);

      await api()
        .delete(`/api/v1/products/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await api().get(`/api/v1/products/${created.body.id}`).expect(404);
    });

    it('rejects a duplicate SKU with 409', async () => {
      await api()
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nameEn: 'Duplicate SKU',
          nameBn: 'ডুপ্লিকেট',
          slug: `dup-${Date.now()}`,
          sku: 'KG-WAT-001',
          categoryId: 'cat-gadgets',
          brand: 'E2E',
          shortDescEn: 'x',
          shortDescBn: 'x',
          descriptionEn: 'x',
          descriptionBn: 'x',
          price: 100,
          stockQuantity: 1,
          thumbnailUrl: 'https://picsum.photos/seed/dup/400/400',
        })
        .expect(409);
    });
  });

  describe('admin users (role management)', () => {
    type AdminRow = { id: string; email: string; role: string; passwordHash?: string };

    const listAdmins = async (): Promise<AdminRow[]> => {
      const res = await api()
        .get('/api/v1/admins')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      return res.body as AdminRow[];
    };

    const setRole = (id: string, role: string, token = adminToken) =>
      api()
        .patch(`/api/v1/admins/${id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role });

    it('lets a Super Admin list the staff accounts without exposing hashes', async () => {
      const admins = await listAdmins();

      expect(admins.length).toBeGreaterThanOrEqual(3);
      expect(admins.some((a) => a.role === 'SUPER_ADMIN')).toBe(true);
      expect(admins.every((a) => a.passwordHash === undefined)).toBe(true);
    });

    it('403s a non-super admin from reading or changing roles', async () => {
      const staff = await api()
        .post('/api/v1/auth/admin/login')
        .send({ email: 'staff@khujigo.com', password: 'staff123' })
        .expect(200);
      const staffToken = staff.body.accessToken;

      await api()
        .get('/api/v1/admins')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      const admins = await listAdmins();
      const manager = admins.find((a) => a.email === 'manager@khujigo.com');

      await setRole(manager!.id, 'STAFF', staffToken).expect(403);
    });

    it('promotes a staff account and restores it', async () => {
      const admins = await listAdmins();
      const staff = admins.find((a) => a.email === 'staff@khujigo.com');
      expect(staff?.role).toBe('STAFF');

      const promoted = await setRole(staff!.id, 'ADMIN').expect(200);
      expect(promoted.body.role).toBe('ADMIN');

      await api()
        .patch(`/api/v1/admins/${staff!.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' })
        .expect(200);

      const restored = await setRole(staff!.id, 'STAFF').expect(200);
      expect(restored.body.role).toBe('STAFF');
    });

    it('signs the affected admin out so the old role cannot be reused', async () => {
      const staffLogin = await api()
        .post('/api/v1/auth/admin/login')
        .send({ email: 'staff@khujigo.com', password: 'staff123' })
        .expect(200);

      const admins = await listAdmins();
      const staff = admins.find((a) => a.email === 'staff@khujigo.com');

      await setRole(staff!.id, 'ADMIN').expect(200);

      // Their refresh token was revoked, so the session cannot be extended.
      await api()
        .post('/api/v1/auth/admin/refresh')
        .send({ refreshToken: staffLogin.body.refreshToken })
        .expect(401);

      await setRole(staff!.id, 'STAFF').expect(200);
    });

    it('refuses to demote the last Super Admin', async () => {
      const me = await api()
        .get('/api/v1/auth/admin/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await setRole(me.body.id, 'STAFF').expect(400);
      expect(String(res.body.message)).toMatch(/at least one Super Admin/i);
    });

    it('refuses to let an admin change their own role', async () => {
      // Promote the manager first so a second Super Admin exists — with only
      // one, the last-Super-Admin rule fires before the self-change rule.
      const admins = await listAdmins();
      const manager = admins.find((a) => a.email === 'manager@khujigo.com');
      await setRole(manager!.id, 'SUPER_ADMIN').expect(200);

      const managerLogin = await api()
        .post('/api/v1/auth/admin/login')
        .send({ email: 'manager@khujigo.com', password: 'manager123' })
        .expect(200);

      const res = await setRole(
        manager!.id,
        'ADMIN',
        managerLogin.body.accessToken,
      ).expect(400);
      expect(String(res.body.message)).toMatch(/your own role/i);

      await setRole(manager!.id, 'ADMIN').expect(200);
    });

    it('rejects an unknown role and an unknown admin', async () => {
      const admins = await listAdmins();
      const staff = admins.find((a) => a.email === 'staff@khujigo.com');

      await setRole(staff!.id, 'WIZARD').expect(400);
      await setRole('admin-does-not-exist', 'ADMIN').expect(404);
    });
  });

  describe('public content', () => {
    it('lists categories with product counts', async () => {
      const res = await api().get('/api/v1/categories').expect(200);
      expect(res.body.length).toBe(6);
      expect(typeof res.body[0].productCount).toBe('number');
    });

    it('lists ordered banners', async () => {
      const res = await api().get('/api/v1/banners').expect(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].displayOrder).toBeLessThanOrEqual(
        res.body[1].displayOrder,
      );
    });

    it('exposes delivery settings', async () => {
      const res = await api().get('/api/v1/delivery-settings').expect(200);
      expect(res.body.insideDhaka).toBe(60);
      expect(res.body.freeDeliveryThreshold).toBe(2500);
    });

    it('protects delivery-settings writes', async () => {
      await api()
        .patch('/api/v1/delivery-settings')
        .send({ insideDhaka: 1 })
        .expect(401);

      const res = await api()
        .patch('/api/v1/delivery-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ insideDhaka: 70 })
        .expect(200);
      expect(res.body.insideDhaka).toBe(70);

      // Restore the seeded value for subsequent runs.
      await api()
        .patch('/api/v1/delivery-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ insideDhaka: 60 })
        .expect(200);
    });
  });
});
