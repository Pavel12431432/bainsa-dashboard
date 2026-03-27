import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { todayRome } from "@/lib/date";

async function login(formData: FormData) {
  "use server";

  const password = formData.get("password") as string;
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected || password !== expected) {
    redirect("/login?error=1");
  }

  const token = createToken();
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SECURE_COOKIES === "true",
    maxAge: MAX_AGE,
    path: "/",
  });

  redirect(`/stories/${todayRome()}`);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; retry?: string }>;
}) {
  const params = await searchParams;
  const locked = params.error === "locked";
  const retryMins = params.retry ? Math.ceil(parseInt(params.retry) / 60) : 15;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-black">
      <p className="text-2xl font-semibold text-brand-white tracking-[0.1em] mb-12">
        BAINSA
      </p>

      <form
        className="login-form flex flex-col gap-4 w-full max-w-80"
        action={login}
      >
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          disabled={locked}
          className="bg-border text-brand-white border border-border-mid rounded-md px-4 py-3 text-base outline-none disabled:opacity-40"
        />

        {params.error === "1" && (
          <p className="text-accent-analysis text-sm m-0">Wrong password.</p>
        )}
        {locked && (
          <p className="text-accent-analysis text-sm m-0">
            Too many attempts — try again in {retryMins} min.
          </p>
        )}

        <button
          type="submit"
          className="login-btn border-none rounded-md px-4 py-3 text-sm font-semibold tracking-[0.06em]"
          disabled={locked}
        >
          ENTER
        </button>
      </form>
    </main>
  );
}
