import { env } from "cloudflare:workers";
import type { RequestHandler } from "express";
import { jwtVerify } from "jose";
import type { AuthContext, Role } from "../lib/auth-types";

const bindings = env as typeof env & {
  JWT_SECRET?: string;
};

const validRoles: Role[] = ["viewer", "editor", "admin"];

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const secret = bindings.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Server authentication is not configured" });
  }

  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] }
    );

    const userId = Number(verified.payload.sub);
    const role = verified.payload.role;
    const email = verified.payload.email;

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      typeof email !== "string" ||
      typeof role !== "string" ||
      !validRoles.includes(role as Role)
    ) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const auth: AuthContext = {
      userId,
      email,
      role: role as Role
    };

    (res.locals as { auth?: AuthContext }).auth = auth;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};