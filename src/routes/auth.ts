import { env } from "cloudflare:workers";
import { Router } from "express";
import { SignJWT } from "jose";
import { verifyPassword } from "../lib/password";
import type { Role } from "../lib/auth-types";

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: string;
};

const bindings = env as typeof env & {
  JWT_SECRET?: string;
  LOGIN_RATE_LIMITER: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
};

const router = Router();
const validRoles: Role[] = ["viewer", "editor", "admin"];

router.post("/login", async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  const password =
    typeof req.body?.password === "string"
      ? req.body.password
      : "";

  if (!email || email.length > 254 || !password || password.length > 200) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const rateResult = await bindings.LOGIN_RATE_LIMITER.limit({
      key: "login:" + email
    });

    if (!rateResult.success) {
      return res.status(429).json({
        error: "Too many login attempts. Please try again later."
      });
    }

    const user = await env.DB.prepare(
      "SELECT id, email, password_hash, role FROM users WHERE email = ?"
    ).bind(email).first<UserRow>();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect" });
    }

    const role = user.role as Role;
    if (!validRoles.includes(role)) {
      console.error("User record has an unsupported role");
      return res.status(500).json({ error: "Account configuration error" });
    }

    const secret = bindings.JWT_SECRET;
    if (!secret || secret.length < 32) {
      console.error("JWT_SECRET is missing or too short");
      return res.status(500).json({ error: "Server authentication is not configured" });
    }

    const token = await new SignJWT({
      email: user.email,
      role
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(user.id))
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(secret));

    return res.json({
      token,
      tokenType: "Bearer",
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        role
      }
    });
  } catch (error) {
    console.error("Login request failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;