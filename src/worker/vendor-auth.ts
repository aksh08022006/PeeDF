import { Context } from "hono";
import bcrypt from "bcryptjs";

const VENDOR_SESSION_COOKIE = "vendor_session";

export async function createVendorSession(c: Context, vendorId: number) {
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Store session in database
  await c.env.DB.prepare(
    `INSERT INTO vendor_sessions (vendor_id, session_token, expires_at, created_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
  )
    .bind(vendorId, sessionToken, expiresAt.toISOString())
    .run();

  return sessionToken;
}

export async function verifyVendorSession(c: Context): Promise<number | null> {
  const sessionToken = getCookie(c, VENDOR_SESSION_COOKIE);
  
  if (!sessionToken) {
    return null;
  }

  const session = (await c.env.DB.prepare(
    `SELECT vendor_id, expires_at FROM vendor_sessions 
     WHERE session_token = ? AND expires_at > datetime('now')`
  )
    .bind(sessionToken)
    .first()) as { vendor_id: number; expires_at: string } | null;

  if (!session) {
    return null;
  }

  return session.vendor_id;
}

export async function deleteVendorSession(c: Context) {
  const sessionToken = getCookie(c, VENDOR_SESSION_COOKIE);
  
  if (sessionToken) {
    await c.env.DB.prepare(
      "DELETE FROM vendor_sessions WHERE session_token = ?"
    )
      .bind(sessionToken)
      .run();
  }
}

export async function verifyVendorPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

function getCookie(c: Context, name: string): string | undefined {
  const cookies = c.req.header("cookie");
  if (!cookies) return undefined;

  const cookieArray = cookies.split(";").map((cookie) => cookie.trim());
  const targetCookie = cookieArray.find((cookie) =>
    cookie.startsWith(`${name}=`)
  );

  return targetCookie?.split("=")[1];
}

export { VENDOR_SESSION_COOKIE };
