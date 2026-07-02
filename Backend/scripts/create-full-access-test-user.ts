import crypto from 'crypto';
import { getSupabaseServer } from '../src/services/supabase.service';

type CliArgs = {
  email?: string;
  password?: string;
  name?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === '--email' && next) {
      args.email = next;
      i += 1;
    } else if (current === '--password' && next) {
      args.password = next;
      i += 1;
    } else if (current === '--name' && next) {
      args.name = next;
      i += 1;
    }
  }

  return args;
}

function makeDefaultEmail(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `apple.tester.${stamp}@snapngrasp.test`;
}

function makePassword(): string {
  const random = crypto.randomBytes(8).toString('hex');
  return `SNG!${random}A1`;
}

async function run(): Promise<void> {
  const { email, password, name } = parseArgs(process.argv.slice(2));
  const finalEmail = email || makeDefaultEmail();
  const finalPassword = password || makePassword();
  const displayName = name || 'Apple Review Tester';

  const supabase = getSupabaseServer();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAtIso = new Date(now.getTime() + 370 * 24 * 60 * 60 * 1000).toISOString();
  const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: finalEmail,
    password: finalPassword,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (createError || !created.user) {
    throw new Error(`Failed to create auth user: ${createError?.message || 'unknown error'}`);
  }

  const userId = created.user.id;

  // Ensure profile exists so authenticated routes can resolve req.user.profile.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        email: finalEmail,
        display_name: displayName,
        role: 'user',
        onboarding_completed: true,
        learning_style: 'visual',
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    );

  if (profileError) {
    throw new Error(`Failed to create/update profile: ${profileError.message}`);
  }

  const { error: subscriptionError } = await supabase
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_id: 'pro_annual',
        status: 'active',
        billing_cycle: 'yearly',
        started_at: nowIso,
        expires_at: expiresAtIso,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    );

  if (subscriptionError) {
    throw new Error(`Failed to create/update subscription: ${subscriptionError.message}`);
  }

  // High limits for unrestricted QA/testing while keeping yearly plan identity.
  const { error: creditsError } = await supabase
    .from('user_credits')
    .upsert(
      {
        user_id: userId,
        uploads_used: 0,
        uploads_limit: 1000,
        upload_period: 'day',
        upload_period_start: nowIso,
        diagrams_used: 0,
        diagrams_limit: 1000,
        diagrams_period_start: monthStartIso,
        voice_seconds_used: 0,
        voice_seconds_limit: 360000,
        voice_period_start: monthStartIso,
        max_pages: 100,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    );

  if (creditsError) {
    throw new Error(`Failed to create/update credits: ${creditsError.message}`);
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: finalEmail,
    password: finalPassword,
  });

  if (signInError || !signInData.user) {
    throw new Error(`User created but login validation failed: ${signInError?.message || 'unknown error'}`);
  }

  console.log('----------------------------------------');
  console.log('Full-access yearly test account created');
  console.log('----------------------------------------');
  console.log(`Email: ${finalEmail}`);
  console.log(`Password: ${finalPassword}`);
  console.log(`User ID: ${userId}`);
  console.log('Plan: pro_annual (active)');
  console.log(`Expires At: ${expiresAtIso}`);
  console.log('Credits: uploads=1000/day, diagrams=1000/month, voice=360000 sec/month, max_pages=100');
  console.log('----------------------------------------');
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  process.exit(1);
});
