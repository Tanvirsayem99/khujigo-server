/**
 * Fail-fast environment validation. Runs before the app boots so a missing
 * secret surfaces immediately instead of as a confusing runtime error.
 */
export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];

  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!config[key] || String(config[key]).trim() === '') {
      errors.push(`${key} is required`);
    }
  }

  const insecure = ['change-me', 'CHANGE_ME', 'REPLACE_WITH'];
  if (config.NODE_ENV === 'production') {
    const placeholders = required.filter((key) =>
      insecure.some((marker) => String(config[key] ?? '').includes(marker)),
    );
    if (placeholders.length > 0) {
      errors.push(
        `${placeholders.join(', ')} still contain placeholder values — set real secrets before running in production`,
      );
    }
  }

  if (config.PORT !== undefined && Number.isNaN(Number(config.PORT))) {
    errors.push('PORT must be a number');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n  - ${errors.join('\n  - ')}`,
    );
  }

  return config;
}
