import { auth } from "@clerk/nextjs/server";
import { AdminConsole } from "./AdminConsole";
import { isAdminUser } from "@/lib/auth/admin";

export default async function AdminPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) && Boolean(process.env.CLERK_SECRET_KEY?.trim());

  if (!clerkConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-[var(--dreambaby-text)]">
          Admin console unavailable
        </h1>
        <p className="mt-4 text-sm text-[var(--dreambaby-muted)]">
          Clerk credentials are not configured. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to enable the admin dashboard.
        </p>
      </div>
    );
  }

  const { userId } = await auth();

  if (!isAdminUser(userId)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-[var(--dreambaby-text)]">
          Administrator access required
        </h1>
        <p className="mt-4 text-sm text-[var(--dreambaby-muted)]">
          This console is restricted. Ask a workspace owner to add your Clerk ID to `ADMIN_CLERK_IDS`.
        </p>
      </div>
    );
  }

  return <AdminConsole />;
}
