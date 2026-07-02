import { z } from 'zod';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  
  // Anthropic Claude
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_CHAT_MODEL: z.string().default('claude-sonnet-4-20250514'),
  
  // OAuth
  OAUTH_REDIRECT_URL: z.string().url().optional(),
  
  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Apple IAP
  APPLE_IAP_SHARED_SECRET: z.string().optional(),
  APPLE_IAP_MONTHLY_PRODUCT_ID: z.string().optional(),
  APPLE_IAP_YEARLY_PRODUCT_ID: z.string().optional(),
  APPLE_IAP_PRO_PLUS_MONTHLY_PRODUCT_ID: z.string().optional(),

  // RevenueCat
  REVENUECAT_SECRET_API_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_AUTH_HEADER: z.string().optional(),
  REVENUECAT_ENTITLEMENT_PRO: z.string().optional(),
  REVENUECAT_ENTITLEMENT_PRO_PLUS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
  logger.info('[OK] Environment variables validated successfully');
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error('[ERROR] Invalid environment variables:');
    error.errors.forEach((err) => {
      logger.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

export { env };
export default env;
