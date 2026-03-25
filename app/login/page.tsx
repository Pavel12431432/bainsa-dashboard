import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";

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

  const today = new Date().toISOString().slice(0, 10);
  redirect(`/stories/${today}`);
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
    <>
      <style>{`
        .login-btn { background: #333; color: #666; cursor: not-allowed; pointer-events: none; }
        .login-form:has(input[type="password"]:not(:placeholder-shown)) .login-btn {
          background: #f4f3f3; color: #0a0a0a; cursor: pointer; pointer-events: auto;
        }
      `}</style>
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <p
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "#f4f3f3",
            letterSpacing: "0.1em",
            marginBottom: "48px",
            fontFamily: "inherit",
          }}
        >
          BAINSA
        </p>

        <form
          className="login-form"
          action={login}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
            maxWidth: "320px",
          }}
        >
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoFocus
            disabled={locked}
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "6px",
              padding: "12px 16px",
              color: "#f4f3f3",
              fontSize: "1rem",
              outline: "none",
              fontFamily: "inherit",
              opacity: locked ? 0.4 : 1,
            }}
          />

          {params.error === "1" && (
            <p style={{ color: "#fe6203", fontSize: "0.875rem", margin: 0 }}>
              Wrong password.
            </p>
          )}
          {locked && (
            <p style={{ color: "#fe6203", fontSize: "0.875rem", margin: 0 }}>
              Too many attempts — try again in {retryMins} min.
            </p>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={locked}
            style={{
              border: "none",
              borderRadius: "6px",
              padding: "12px 16px",
              fontSize: "0.875rem",
              fontWeight: 600,
              fontFamily: "inherit",
              letterSpacing: "0.06em",
            }}
          >
            ENTER
          </button>
        </form>
      </main>
    </>
  );
}
