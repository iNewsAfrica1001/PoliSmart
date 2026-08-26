import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const SESSION_DAYS = 7;
const RESET_MINUTES = 30;
const VERIFY_HOURS = 24;

export function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}
export function validatePassword(password) {
  const value = String(password ?? "");
  if (
    value.length < 12 ||
    value.length > 128 ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value)
  ) {
    const error = new Error(
      "Password must be 12-128 characters and include upper-case, lower-case, and numeric characters.",
    );
    error.status = 400;
    throw error;
  }
  return value;
}
export function hashToken(token, secret) {
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}
export function newOpaqueToken() {
  return randomBytes(32).toString("base64url");
}
export async function hashPassword(password) {
  return bcrypt.hash(validatePassword(password), 12);
}
export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(String(password ?? ""), passwordHash);
}

export function createAuthenticationService(
  database,
  { tokenSecret, now = () => new Date(), notifications = null },
) {
  if (!tokenSecret || tokenSecret.length < 32)
    throw new Error("Authentication token secret must be at least 32 characters.");
  const expiresFromNow = (milliseconds) => new Date(now().getTime() + milliseconds);

  async function issueToken(model, userId, lifetimeMs) {
    const token = newOpaqueToken();
    await model.create({
      data: {
        userId,
        tokenHash: hashToken(token, tokenSecret),
        expiresAt: expiresFromNow(lifetimeMs),
      },
    });
    return token;
  }

  return {
    async register({ email, password, displayName, organizationName, country }) {
      const normalizedEmail = normalizeEmail(email);
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail))
        throw Object.assign(new Error("A valid email address is required."), { status: 400 });
      const passwordHash = await hashPassword(password);
      const slugBase = String(organizationName ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!displayName?.trim() || !slugBase || !country?.trim())
        throw Object.assign(new Error("Display name, organization, and country are required."), {
          status: 400,
        });
      const result = await database.$transaction(async (tx) => {
        const user = await tx.authUser.create({
          data: { email: normalizedEmail, passwordHash, displayName: displayName.trim() },
        });
        const organization = await tx.organization.create({
          data: {
            name: organizationName.trim(),
            slug: `${slugBase}-${randomBytes(4).toString("hex")}`,
            country: country.trim(),
          },
        });
        const membership = await tx.membership.create({
          data: { userId: user.id, tenantId: organization.id, role: "CAMPAIGN_ADMINISTRATOR" },
        });
        return { user, organization, membership };
      });
      const verificationToken = await issueToken(
        database.emailVerificationToken,
        result.user.id,
        VERIFY_HOURS * 60 * 60 * 1000,
      );
      await notifications?.sendEmailVerification({
        email: result.user.email,
        token: verificationToken,
      });
      return { ...result, verificationToken };
    },
    async login({ email, password, userAgent, ipHash }) {
      const user = await database.authUser.findUnique({
        where: { email: normalizeEmail(email) },
        include: { memberships: { where: { status: "ACTIVE" }, include: { organization: true } } },
      });
      if (!user || !(await verifyPassword(password, user.passwordHash)))
        throw Object.assign(new Error("Invalid email or password."), { status: 401 });
      const token = newOpaqueToken();
      const session = await database.authSession.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token, tokenSecret),
          expiresAt: expiresFromNow(SESSION_DAYS * 86400000),
          userAgent,
          ipHash,
        },
      });
      return { token, session, user };
    },
    async authenticate(token) {
      if (!token) return null;
      const session = await database.authSession.findUnique({
        where: { tokenHash: hashToken(token, tokenSecret) },
        include: {
          user: {
            include: {
              memberships: { where: { status: "ACTIVE" }, include: { organization: true } },
            },
          },
        },
      });
      if (!session || session.expiresAt <= now()) {
        if (session) await database.authSession.delete({ where: { id: session.id } });
        return null;
      }
      return session;
    },
    async logout(token) {
      if (token)
        await database.authSession.deleteMany({
          where: { tokenHash: hashToken(token, tokenSecret) },
        });
    },
    async requestPasswordReset(email) {
      const user = await database.authUser.findUnique({ where: { email: normalizeEmail(email) } });
      if (!user) return null;
      await database.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      const token = await issueToken(database.passwordResetToken, user.id, RESET_MINUTES * 60000);
      await notifications?.sendPasswordReset({ email: user.email, token });
      return token;
    },
    async resetPassword(token, password) {
      const tokenHash = hashToken(token, tokenSecret);
      const reset = await database.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!reset || reset.usedAt || reset.expiresAt <= now())
        throw Object.assign(new Error("Reset token is invalid or expired."), { status: 400 });
      const passwordHash = await hashPassword(password);
      await database.$transaction([
        database.authUser.update({ where: { id: reset.userId }, data: { passwordHash } }),
        database.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: now() } }),
        database.authSession.deleteMany({ where: { userId: reset.userId } }),
      ]);
    },
    async verifyEmail(token) {
      const verification = await database.emailVerificationToken.findUnique({
        where: { tokenHash: hashToken(token, tokenSecret) },
      });
      if (!verification || verification.usedAt || verification.expiresAt <= now())
        throw Object.assign(new Error("Verification token is invalid or expired."), {
          status: 400,
        });
      await database.$transaction([
        database.authUser.update({
          where: { id: verification.userId },
          data: { emailVerifiedAt: now() },
        }),
        database.emailVerificationToken.update({
          where: { id: verification.id },
          data: { usedAt: now() },
        }),
      ]);
    },
  };
}
