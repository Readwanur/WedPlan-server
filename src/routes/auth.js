import express from "express";
import {
  buildIdQuery,
  getCollections,
  normalizeUser,
} from "../config/db.js";
import { generateJWT, verifyJWT } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/auth/jwt
 * Exchanges an active Better Auth session from MongoDB for an Express backend JWT.
 * Also ensures the user document in MongoDB has all required schema defaults.
 */
router.post("/jwt", async (req, res) => {
  try {
    const { sessionToken, userId, email } = req.body || {};
    const { users, sessions } = getCollections();

    let userDoc = null;

    // 1. Verify via explicit Better Auth session token in MongoDB `session` collection
    if (sessionToken) {
      const sessionDoc = await sessions.findOne({
        $or: [{ token: sessionToken }, { _id: sessionToken }],
      });

      if (sessionDoc) {
        if (sessionDoc.expiresAt && new Date(sessionDoc.expiresAt) < new Date()) {
          return res.status(401).json({
            ok: false,
            error: "Session has expired. Please sign in again.",
          });
        }
        userDoc = await users.findOne(buildIdQuery(String(sessionDoc.userId)));
      }
    }

    // 2. Fallback: verify user has an active non-expired session in MongoDB `session` collection
    if (!userDoc && (userId || email)) {
      let candidateUser = null;
      if (userId) {
        candidateUser = await users.findOne(buildIdQuery(String(userId)));
      }
      if (!candidateUser && email) {
        candidateUser = await users.findOne({
          email: String(email).toLowerCase().trim(),
        });
      }

      if (candidateUser) {
        const candidateIdStr = String(candidateUser._id);
        const activeSession = await sessions.findOne({
          $or: [
            { userId: candidateIdStr },
            { userId: candidateUser._id },
            ...(candidateUser.id ? [{ userId: candidateUser.id }] : []),
          ],
        });

        if (
          activeSession &&
          (!activeSession.expiresAt ||
            new Date(activeSession.expiresAt) > new Date())
        ) {
          userDoc = candidateUser;
        }
      }
    }

    if (!userDoc) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized: No active authenticated session found.",
      });
    }

    // Ensure required schema defaults exist on the user document in MongoDB
    const updates = {};
    if (!userDoc.role) updates.role = "customer";
    if (typeof userDoc.isBlocked !== "boolean") updates.isBlocked = false;
    if (!userDoc.subscriptionPlan) updates.subscriptionPlan = "free";
    if (userDoc.subscriptionExpiresAt === undefined) {
      updates.subscriptionExpiresAt = null;
    }

    if (Object.keys(updates).length > 0) {
      await users.updateOne({ _id: userDoc._id }, { $set: updates });
      Object.assign(userDoc, updates);
    }

    const normalized = normalizeUser(userDoc);
    const token = generateJWT(normalized);

    return res.status(200).json({
      ok: true,
      token,
      user: normalized,
    });
  } catch (error) {
    console.error("Error issuing JWT:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to generate authentication token.",
    });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user profile verified via JWT
 */
router.get("/me", verifyJWT, async (req, res) => {
  return res.status(200).json({
    ok: true,
    user: req.user,
  });
});

export default router;
