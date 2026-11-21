import jwt from "jsonwebtoken";
import { getCollections } from "../config/db.js";
import { buildIdQuery, normalizeUser } from "../utils/helpers.js";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  "nPGfRA5qzwsnrc869jVpho2h9jWyxK08";

/**
 * Generates a signed JWT for an authenticated user
 */
export function generateJWT(user) {
  return jwt.sign(
    {
      sub: String(user.id || user._id),
      email: user.email,
      role: user.role || "customer",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Middleware: Verifies JWT from Authorization Bearer header, validates user against MongoDB,
 * checks subscription expiration, and attaches live user document to req.user.
 * Never trusts client-provided role or userId without server-side DB verification.
 */
export async function verifyJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (req.headers["x-access-token"]) {
      token = String(req.headers["x-access-token"]).trim();
    }

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized: Missing authentication token.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const isExpired = err.name === "TokenExpiredError";
      return res.status(401).json({
        ok: false,
        error: isExpired
          ? "Unauthorized: Authentication token has expired. Please sign in again."
          : "Unauthorized: Invalid authentication token.",
      });
    }

    const { users } = getCollections();
    let userDoc = null;

    if (decoded.sub) {
      userDoc = await users.findOne(buildIdQuery(decoded.sub));
    }
    if (!userDoc && decoded.email) {
      userDoc = await users.findOne({ email: decoded.email.toLowerCase() });
    }

    if (!userDoc) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized: User account no longer exists.",
      });
    }

    // Handle subscription expiration automatically
    if (
      userDoc.subscriptionPlan === "premium" &&
      userDoc.subscriptionExpiresAt &&
      new Date(userDoc.subscriptionExpiresAt) < new Date()
    ) {
      await users.updateOne(
        { _id: userDoc._id },
        {
          $set: {
            subscriptionPlan: "free",
            subscriptionExpiresAt: null,
            updatedAt: new Date(),
          },
        }
      );
      userDoc.subscriptionPlan = "free";
      userDoc.subscriptionExpiresAt = null;
    }

    req.user = normalizeUser(userDoc);
    req.rawUser = userDoc;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error during authentication verification.",
    });
  }
}

/**
 * Middleware: Ensures the authenticated user is not blocked by an administrator.
 * Blocked users must not access protected platform features.
 */
export function verifyNotBlocked(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized: Authentication required.",
    });
  }

  if (req.user.isBlocked) {
    return res.status(403).json({
      ok: false,
      error:
        "Forbidden: Your account has been blocked by an administrator and cannot access protected platform features.",
    });
  }

  next();
}

/**
 * Role-based authorization middleware factory for Admin, Vendor, and Customer
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized: Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: `Forbidden: This action requires ${allowedRoles.join(" or ")} role privileges. Your role is '${req.user.role}'.`,
      });
    }

    next();
  };
}
