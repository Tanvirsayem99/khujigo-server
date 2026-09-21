/**
 * Jest runs before the test files import AppModule (and therefore before
 * ConfigModule.forRoot validates the environment). Pinning NODE_ENV here keeps
 * the suite deterministic even when the shell exports NODE_ENV=production.
 */
process.env.NODE_ENV = 'test';
