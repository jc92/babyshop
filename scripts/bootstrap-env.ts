import { execSync } from "node:child_process";
import readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function ask(question: string) {
  return rl.question(question);
}

async function ensureVercelLogin() {
  try {
    execSync("vercel whoami", { stdio: "ignore" });
  } catch {
    console.log("You are not logged into Vercel. Opening login flow...\n");
    execSync("vercel login", { stdio: "inherit" });
  }
}

async function addEnv(key: string, value: string, environments: string[] = ["development", "preview", "production"]) {
  for (const environment of environments) {
    execSync(`vercel env add ${key} ${environment}`, {
      input: Buffer.from(`${value}\n`, "utf-8"),
      stdio: ["pipe", "inherit", "inherit"],
    });
  }
}

async function main() {
  console.log("\n=== Vercel + Google Auth Bootstrap ===\n");

  await ensureVercelLogin();

  console.log("\n1. Linking project (if not already linked)...\n");
  try {
    execSync("vercel link --yes", { stdio: "inherit" });
  } catch (error) {
    console.error("Failed to link project:", error);
    process.exit(1);
  }

  console.log("\n2. Configuring Google OAuth credentials...\n");
  console.log(
    "Visit https://console.cloud.google.com/apis/credentials, create a Web OAuth client with redirect URIs:\n" +
      "  • http://localhost:3000/api/auth/callback/google\n  • https://<your-project>.vercel.app/api/auth/callback/google\n",
  );

  const googleClientId = await ask("Enter GOOGLE_CLIENT_ID: ");
  const googleClientSecret = await ask("Enter GOOGLE_CLIENT_SECRET: ");

  const nextAuthSecret = await ask(
    "Enter NEXTAUTH_SECRET (leave blank to generate automatically): ",
  );
  const finalNextAuthSecret = nextAuthSecret.trim().length
    ? nextAuthSecret
    : execSync("openssl rand -base64 32").toString().trim();

  const nextAuthUrl = await ask(
    "Enter NEXTAUTH_URL (e.g., https://your-project.vercel.app): ",
  );

  console.log("\n3. Adding environment variables to Vercel (development/preview/production)...\n");
  await addEnv("GOOGLE_CLIENT_ID", googleClientId);
  await addEnv("GOOGLE_CLIENT_SECRET", googleClientSecret);
  await addEnv("NEXTAUTH_SECRET", finalNextAuthSecret);
  await addEnv("NEXTAUTH_URL", nextAuthUrl);

  console.log("\n4. Configuring database credentials...\n");
  console.log(
    "If you have not created a Neon database, visit the Vercel dashboard → Storage → Create database → Neon."
  );
  const postgresUrl = await ask("Enter POSTGRES_URL (pooled connection string): ");
  if (postgresUrl.trim()) {
    await addEnv("POSTGRES_URL", postgresUrl);
  }

  console.log("\n5. Pulling environment variables into .env.local...\n");
  execSync("vercel env pull .env.local", { stdio: "inherit" });

  console.log("\nAll done! You can now run `pnpm dev` to test authentication locally.\n");
  await rl.close();
}

main().catch((error) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});
