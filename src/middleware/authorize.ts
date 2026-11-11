import type { RequestHandler } from "express";
import type { AuthContext, Role } from "../lib/auth-types";

export function allowRoles(...allowedRoles: Role[]): RequestHandler {
  return (_req, res, next) => {
    const auth = (res.locals as { auth?: AuthContext }).auth;

    if (!auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(auth.role)) {
      return res.status(403).json({ error: "You do not have permission" });
    }

    return next();
  };
}