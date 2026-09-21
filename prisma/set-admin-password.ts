import { PrismaClient, TokenSubject } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.util';

const prisma = new PrismaClient();

const MIN_LENGTH = 12;

/**
 * Rotates an admin account's password.
 *
 *   ADMIN_EMAIL=admin@khujigo.com ADMIN_PASSWORD='...' npm run admin:password
 *
 * The value is read from the environment so it never lands in shell history as
 * an argument. Every active session for the account is revoked on success.
 */
async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running.');
  }
  if (password.length < MIN_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD must be at least ${MIN_LENGTH} characters.`,
    );
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    throw new Error(`No admin account found for "${email}".`);
  }

  await prisma.admin.update({
    where: { email },
    data: { passwordHash: await hashPassword(password) },
  });

  // The old password may be compromised, so end every session it opened.
  const revoked = await prisma.refreshToken.updateMany({
    where: {
      subject: TokenSubject.ADMIN,
      subjectId: admin.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  console.log(
    `Updated password for ${admin.email} (${admin.role}). Revoked ${revoked.count} active session(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
