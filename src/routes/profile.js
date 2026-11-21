import express from "express";
import { getCollections } from "../config/db.js";
import { verifyJWT, verifyNotBlocked } from "../middleware/auth.js";
import { normalizeUser } from "../utils/helpers.js";

const router = express.Router();

/**
 * GET /api/profile
 * Returns the authenticated user's profile information
 */
router.get("/", verifyJWT, verifyNotBlocked, async (req, res) => {
  return res.status(200).json({
    ok: true,
    user: req.user,
  });
});

/**
 * PATCH /api/profile
 * Updates editable profile fields (name, image, phone, location, bio, businessName).
 * Rule: Users must not be able to change their own role or subscription status through profile updates.
 */
router.patch("/", verifyJWT, verifyNotBlocked, async (req, res) => {
  try {
    const {
      name,
      image,
      phone,
      location,
      bio,
      businessName,
      role,
      subscriptionPlan,
      isBlocked,
    } = req.body || {};

    // Rule enforcement: reject explicit attempts to escalate role, subscriptionPlan, or isBlocked
    if (
      (role !== undefined && role !== req.user.role) ||
      (subscriptionPlan !== undefined &&
        subscriptionPlan !== req.user.subscriptionPlan) ||
      (isBlocked !== undefined && Boolean(isBlocked) !== req.user.isBlocked)
    ) {
      return res.status(403).json({
        ok: false,
        error:
          "Forbidden: Users cannot modify their account role, block status, or subscription status through profile updates.",
      });
    }

    if (name !== undefined && (!String(name).trim() || String(name).trim().length < 2)) {
      return res.status(400).json({
        ok: false,
        error: "Full name is required and must be at least 2 characters.",
      });
    }

    const updateFields = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateFields.name = String(name).trim();
    if (image !== undefined) updateFields.image = String(image).trim();
    if (phone !== undefined) updateFields.phone = String(phone).trim();
    if (location !== undefined) updateFields.location = String(location).trim();
    if (bio !== undefined) updateFields.bio = String(bio).trim();
    if (businessName !== undefined && req.user.role === "vendor") {
      updateFields.businessName = String(businessName).trim();
    }

    const { users, services } = getCollections();

    await users.updateOne(
      { _id: req.rawUser._id },
      { $set: updateFields }
    );

    const updatedDoc = await users.findOne({ _id: req.rawUser._id });
    const normalized = normalizeUser(updatedDoc);

    // Sync vendor metadata across their published services so cards remain consistent
    if (normalized.role === "vendor") {
      const vendorIds = [normalized.id, String(req.rawUser._id)];
      if (req.rawUser.id) vendorIds.push(String(req.rawUser.id));

      await services.updateMany(
        { vendorId: { $in: vendorIds } },
        {
          $set: {
            "vendor.name": normalized.name,
            "vendor.businessName":
              normalized.businessName || `${normalized.name} Studio`,
            "vendor.avatar": normalized.image,
            "vendor.phone": normalized.phone || "+8801711223344",
            "vendor.email": normalized.email,
            "vendor.isPremium": normalized.subscriptionPlan === "premium",
          },
        }
      );
    }

    return res.status(200).json({
      ok: true,
      message: "Profile updated successfully.",
      user: normalized,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to update profile information.",
    });
  }
});

export default router;
