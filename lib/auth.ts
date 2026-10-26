import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required but not set. " +
      "Add it to .env.local (dev) or your deployment secrets (production)."
    );
  }
  return secret;
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  companyName: string;
  role: string;
  permissions?: string[];
  sessionId?: string;
  tokenVersion?: number;
  isProfileComplete?: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12); // Raised from 10 → 12 (OWASP 2023)
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  plainText: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

/**
 * Signs a JWT. Pass `expiresIn` to match the cookie maxAge (e.g. "30d" for
 * RememberMe) so the token and cookie lifetime stay in sync.
 */
export function signToken(
  payload: TokenPayload,
  expiresIn: string | number = "7d"
): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}
