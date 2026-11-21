import express from "express";
import { ObjectId } from "mongodb";
import { getCollections } from "../config/db.js";
import {
  requireRole,
  verifyJWT,
  verifyNotBlocked,
} from "../middleware/auth.js";
import { buildIdQuery } from "../utils/helpers.js";

const router = express.Router();

export const ALLOWED_CATEGORIES = [
  "Photography & Videography",
  "Wedding Venues",
  "Decoration & Florist",
  "Catering Services",
  "Makeup & Styling",
  "Wedding Fashion",
];

const FREE_PLAN_MAX_ACTIVE = 3;

function normalizeService(doc, vendorDoc = null) {
  if (!doc) return null;
  const id = doc.id || (doc._id ? String(doc._id) : "");
  const baseVendor = doc.vendor || {};
  const isPremium =
    vendorDoc !== null
      ? vendorDoc.subscriptionPlan === "premium"
      : Boolean(baseVendor.isPremium);

  return {
    id,
    vendorId: String(doc.vendorId || baseVendor.id || ""),
    serviceName: doc.serviceName || doc.name || "Wedding Service Package",
    category: doc.category || "Wedding Venues",
    description: doc.description || "",
    shortSummary:
      doc.shortSummary ||
      (doc.description
        ? doc.description.slice(0, 140) +
          (doc.description.length > 140 ? "..." : "")
        : ""),
    highlights:
      Array.isArray(doc.highlights) && doc.highlights.length > 0
        ? doc.highlights
        : [
            "Dedicated on-site wedding coordinator",
            "Customizable package deliverables",
            "Verified vendor quality guarantee",
          ],
    price: Number(doc.price) || 0,
    priceUnit: doc.priceUnit || "Complete Package",
    location: doc.location || "Dhaka",
    images:
      Array.isArray(doc.images) && doc.images.length > 0
        ? doc.images
        : doc.image
          ? [doc.image]
          : [
              "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80",
            ],
    status: doc.status || "pending",
    isActive: doc.status === "rejected" ? false : Boolean(doc.isActive ?? true),
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
    vendor: {
      id: String(doc.vendorId || baseVendor.id || ""),
      name: vendorDoc?.name || baseVendor.name || "Verified Vendor",
      businessName:
        vendorDoc?.businessName ||
        baseVendor.businessName ||
        vendorDoc?.name ||
        baseVendor.name ||
        "Wedding Studio",
      role: baseVendor.role || "Wedding Vendor",
      avatar:
        vendorDoc?.image ||
        baseVendor.avatar ||
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
      rating: Number(baseVendor.rating) || 4.9,
      reviewsCount: Number(baseVendor.reviewsCount) || 48,
      verified: baseVendor.verified ?? true,
      isPremium,
      experienceYears: Number(baseVendor.experienceYears) || 8,
      phone: vendorDoc?.phone || baseVendor.phone || "+8801711223344",
      email: vendorDoc?.email || baseVendor.email || "vendor@wedplan.com",
    },
  };
}

async function enrichServicesWithVendors(serviceDocs) {
  if (!serviceDocs || serviceDocs.length === 0) return [];
  const { users } = getCollections();
  const allUsers = await users.find({}).toArray();
  const userMap = new Map();
  for (const u of allUsers) {
    if (u._id) userMap.set(String(u._id), u);
    if (u.id) userMap.set(String(u.id), u);
  }
  return serviceDocs.map((doc) => {
    const vDoc = userMap.get(String(doc.vendorId)) || null;
    return normalizeService(doc, vDoc);
  });
}

/**
 * GET /api/services
 * Public route for Home Featured Services & Browse Services page.
 * Returns ONLY approved and active services.
 * Supports advanced search, category filter, location filter, and price sorting (asc/desc).
 */
router.get("/", async (req, res) => {
  try {
    const { search, category, location, sort, limit } = req.query;
    const { services } = getCollections();

    const query = {
      status: "approved",
      isActive: true,
    };

    if (category && category !== "All") {
      query.category = String(category);
    }

    if (location && location !== "All") {
      query.location = { $regex: String(location).trim(), $options: "i" };
    }

    if (search && String(search).trim()) {
      const escaped = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      query.$or = [
        { serviceName: regex },
        { description: regex },
        { shortSummary: regex },
        { category: regex },
        { location: regex },
        { "vendor.businessName": regex },
        { "vendor.name": regex },
      ];
    }

    let sortQuery = { createdAt: -1 };
    if (sort === "price-asc" || sort === "asc") {
      sortQuery = { price: 1 };
    } else if (sort === "price-desc" || sort === "desc") {
      sortQuery = { price: -1 };
    }

    let cursor = services.find(query).sort(sortQuery);
    if (limit && Number(limit) > 0) {
      cursor = cursor.limit(Number(limit));
    }

    const docs = await cursor.toArray();
    const enriched = await enrichServicesWithVendors(docs);

    return res.status(200).json({
      ok: true,
      count: enriched.length,
      services: enriched,
    });
  } catch (error) {
    console.error("Error fetching public services:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to fetch wedding services.",
    });
  }
});

/**
 * GET /api/services/vendor/me
 * Protected Vendor route: returns all services created by the logged-in vendor.
 */
router.get(
  "/vendor/me",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const { services } = getCollections();
      const vendorIdCandidates = [req.user.id, String(req.rawUser._id)];
      if (req.rawUser.id) vendorIdCandidates.push(String(req.rawUser.id));

      const docs = await services
        .find({ vendorId: { $in: vendorIdCandidates } })
        .sort({ createdAt: -1 })
        .toArray();

      const enriched = docs.map((d) => normalizeService(d, req.rawUser));
      const activeCount = enriched.filter(
        (s) => s.isActive && s.status !== "rejected"
      ).length;

      return res.status(200).json({
        ok: true,
        services: enriched,
        activeCount,
        maxFreeActive: FREE_PLAN_MAX_ACTIVE,
        subscriptionPlan: req.user.subscriptionPlan || "free",
      });
    } catch (error) {
      console.error("Error fetching vendor services:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to load vendor services.",
      });
    }
  }
);

/**
 * GET /api/services/:id
 * Private route (requires authentication): returns service details by ID.
 * Invalid service IDs return 404 with a descriptive message.
 * Rejected or unapproved services are hidden from customers.
 */
router.get("/:id", verifyJWT, verifyNotBlocked, async (req, res) => {
  try {
    const rawId = req.params.id;
    const { services, users } = getCollections();

    const doc = await services.findOne(buildIdQuery(rawId));
    if (!doc) {
      return res.status(404).json({
        ok: false,
        error: `Wedding service with ID '${rawId}' was not found.`,
      });
    }

    const isOwner =
      req.user.role === "vendor" &&
      (String(doc.vendorId) === String(req.user.id) ||
        String(doc.vendorId) === String(req.rawUser._id));
    const isAdmin = req.user.role === "admin";

    // Rule: A rejected or non-approved service must not be visible to customers
    if (!isOwner && !isAdmin && (doc.status !== "approved" || !doc.isActive)) {
      return res.status(404).json({
        ok: false,
        error:
          "This wedding service is currently unavailable or awaiting administrator approval.",
      });
    }

    const vendorDoc = await users.findOne(buildIdQuery(String(doc.vendorId)));
    const service = normalizeService(doc, vendorDoc);

    return res.status(200).json({
      ok: true,
      service,
    });
  } catch (error) {
    console.error("Error fetching service details:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to load service details.",
    });
  }
});

/**
 * POST /api/services
 * Protected Vendor route: creates a new wedding service with default status 'pending'.
 * Enforces Free Plan limit (maximum 3 active services).
 */
router.post(
  "/",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const {
        serviceName,
        category,
        description,
        shortSummary,
        highlights,
        price,
        priceUnit,
        location,
        images,
      } = req.body || {};

      if (
        !serviceName ||
        !String(serviceName).trim() ||
        !category ||
        !description ||
        !String(description).trim() ||
        price === undefined ||
        Number(price) <= 0 ||
        !location ||
        !String(location).trim()
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Validation failed: serviceName, category, description, valid positive price, and location are required.",
        });
      }

      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
        });
      }

      const imageList = Array.isArray(images)
        ? images.map((img) => String(img).trim()).filter(Boolean)
        : typeof images === "string" && images.trim()
          ? [images.trim()]
          : [];

      if (imageList.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "At least one service image is required.",
        });
      }

      const { services } = getCollections();
      const vendorIdCandidates = [req.user.id, String(req.rawUser._id)];
      if (req.rawUser.id) vendorIdCandidates.push(String(req.rawUser.id));

      // Enforce Free Plan Limitation on the server
      const currentActiveCount = await services.countDocuments({
        vendorId: { $in: vendorIdCandidates },
        isActive: true,
        status: { $ne: "rejected" },
      });

      const plan = req.user.subscriptionPlan || "free";
      if (plan !== "premium" && currentActiveCount >= FREE_PLAN_MAX_ACTIVE) {
        return res.status(403).json({
          ok: false,
          error:
            "Free Plan limit reached (maximum 3 active services). Please upgrade to the Premium Plan to publish unlimited services.",
        });
      }

      const cleanDesc = String(description).trim();
      const newObjectId = new ObjectId();
      const newServiceDoc = {
        _id: newObjectId,
        id: `srv-${String(newObjectId).slice(-6)}`,
        vendorId: req.user.id,
        serviceName: String(serviceName).trim(),
        category,
        description: cleanDesc,
        shortSummary:
          shortSummary && String(shortSummary).trim()
            ? String(shortSummary).trim()
            : cleanDesc.slice(0, 140) + (cleanDesc.length > 140 ? "..." : ""),
        highlights:
          Array.isArray(highlights) && highlights.length > 0
            ? highlights.map((h) => String(h).trim()).filter(Boolean)
            : [
                "Dedicated event coordinator on-site",
                "Customizable package inclusions",
                "Verified vendor quality guarantee",
              ],
        price: Number(price),
        priceUnit:
          priceUnit && String(priceUnit).trim()
            ? String(priceUnit).trim()
            : "Complete Package",
        location: String(location).trim(),
        images: imageList,
        // Default Status: Pending (until approved by an admin)
        status: "pending",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        vendor: {
          id: req.user.id,
          name: req.user.name,
          businessName:
            req.user.businessName || `${req.user.name} Wedding Studio`,
          role: "Wedding Vendor",
          avatar: req.user.image,
          rating: 4.9,
          reviewsCount: 48,
          verified: true,
          isPremium: plan === "premium",
          experienceYears: 8,
          phone: req.user.phone || "+8801711223344",
          email: req.user.email,
        },
      };

      await services.insertOne(newServiceDoc);
      const normalized = normalizeService(newServiceDoc, req.rawUser);

      return res.status(201).json({
        ok: true,
        message:
          "Wedding service created with Pending status and submitted for admin approval.",
        service: normalized,
      });
    } catch (error) {
      console.error("Error creating service:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to publish wedding service.",
      });
    }
  }
);

/**
 * PATCH /api/services/:id
 * Protected Vendor route: updates an existing service after verifying ownership.
 */
router.patch(
  "/:id",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const rawId = req.params.id;
      const { services } = getCollections();

      const existing = await services.findOne(buildIdQuery(rawId));
      if (!existing) {
        return res.status(404).json({
          ok: false,
          error: "Service not found.",
        });
      }

      const vendorIdCandidates = [req.user.id, String(req.rawUser._id)];
      if (req.rawUser.id) vendorIdCandidates.push(String(req.rawUser.id));

      if (!vendorIdCandidates.includes(String(existing.vendorId))) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: You can only update services that belong to you.",
        });
      }

      const {
        serviceName,
        category,
        description,
        shortSummary,
        highlights,
        price,
        priceUnit,
        location,
        images,
      } = req.body || {};

      const updates = {
        updatedAt: new Date().toISOString(),
      };

      if (serviceName !== undefined) {
        if (!String(serviceName).trim()) {
          return res.status(400).json({
            ok: false,
            error: "Service name cannot be empty.",
          });
        }
        updates.serviceName = String(serviceName).trim();
      }

      if (category !== undefined) {
        if (!ALLOWED_CATEGORIES.includes(category)) {
          return res.status(400).json({
            ok: false,
            error: "Invalid service category.",
          });
        }
        updates.category = category;
      }

      if (description !== undefined) {
        const cleanDesc = String(description).trim();
        if (!cleanDesc) {
          return res.status(400).json({
            ok: false,
            error: "Description cannot be empty.",
          });
        }
        updates.description = cleanDesc;
        updates.shortSummary =
          shortSummary !== undefined
            ? String(shortSummary).trim()
            : cleanDesc.slice(0, 140) + (cleanDesc.length > 140 ? "..." : "");
      } else if (shortSummary !== undefined) {
        updates.shortSummary = String(shortSummary).trim();
      }

      if (price !== undefined) {
        if (Number(price) <= 0) {
          return res.status(400).json({
            ok: false,
            error: "Price must be greater than zero.",
          });
        }
        updates.price = Number(price);
      }

      if (priceUnit !== undefined) {
        updates.priceUnit = String(priceUnit).trim();
      }

      if (location !== undefined) {
        if (!String(location).trim()) {
          return res.status(400).json({
            ok: false,
            error: "Location cannot be empty.",
          });
        }
        updates.location = String(location).trim();
      }

      if (Array.isArray(highlights)) {
        updates.highlights = highlights
          .map((h) => String(h).trim())
          .filter(Boolean);
      }

      if (Array.isArray(images) && images.length > 0) {
        updates.images = images.map((i) => String(i).trim()).filter(Boolean);
      }

      await services.updateOne({ _id: existing._id }, { $set: updates });
      const updatedDoc = await services.findOne({ _id: existing._id });

      return res.status(200).json({
        ok: true,
        message: "Service updated successfully.",
        service: normalizeService(updatedDoc, req.rawUser),
      });
    } catch (error) {
      console.error("Error updating service:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to update wedding service.",
      });
    }
  }
);

/**
 * PATCH /api/services/:id/availability
 * Protected Vendor route: toggles service active/inactive status.
 * Enforces Free Plan limit when activating and blocks activating rejected services.
 */
router.patch(
  "/:id/availability",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const rawId = req.params.id;
      const { services } = getCollections();

      const existing = await services.findOne(buildIdQuery(rawId));
      if (!existing) {
        return res.status(404).json({
          ok: false,
          error: "Service not found.",
        });
      }

      const vendorIdCandidates = [req.user.id, String(req.rawUser._id)];
      if (req.rawUser.id) vendorIdCandidates.push(String(req.rawUser.id));

      if (!vendorIdCandidates.includes(String(existing.vendorId))) {
        return res.status(403).json({
          ok: false,
          error:
            "Forbidden: You can only manage availability for your own services.",
        });
      }

      if (existing.status === "rejected") {
        return res.status(400).json({
          ok: false,
          error:
            "Rejected services are hidden from customers and cannot be activated.",
        });
      }

      const nextActive = !existing.isActive;

      if (nextActive) {
        const currentActiveCount = await services.countDocuments({
          vendorId: { $in: vendorIdCandidates },
          isActive: true,
          status: { $ne: "rejected" },
        });

        const plan = req.user.subscriptionPlan || "free";
        if (plan !== "premium" && currentActiveCount >= FREE_PLAN_MAX_ACTIVE) {
          return res.status(403).json({
            ok: false,
            error:
              "Free Plan allows up to 3 active services. Deactivate another service or upgrade to Premium.",
          });
        }
      }

      await services.updateOne(
        { _id: existing._id },
        {
          $set: {
            isActive: nextActive,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      const updatedDoc = await services.findOne({ _id: existing._id });

      return res.status(200).json({
        ok: true,
        message: `Service marked as ${nextActive ? "Active" : "Inactive"}.`,
        service: normalizeService(updatedDoc, req.rawUser),
      });
    } catch (error) {
      console.error("Error toggling service availability:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to update service availability.",
      });
    }
  }
);

/**
 * DELETE /api/services/:id
 * Protected Vendor or Admin route: deletes a service.
 * Vendors can only delete their own services; Admins can delete any inappropriate service.
 */
router.delete(
  "/:id",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor", "admin"),
  async (req, res) => {
    try {
      const rawId = req.params.id;
      const { services } = getCollections();

      const existing = await services.findOne(buildIdQuery(rawId));
      if (!existing) {
        return res.status(404).json({
          ok: false,
          error: "Service not found.",
        });
      }

      if (req.user.role === "vendor") {
        const vendorIdCandidates = [req.user.id, String(req.rawUser._id)];
        if (req.rawUser.id) vendorIdCandidates.push(String(req.rawUser.id));

        if (!vendorIdCandidates.includes(String(existing.vendorId))) {
          return res.status(403).json({
            ok: false,
            error: "Forbidden: You cannot delete another vendor's service.",
          });
        }
      }

      await services.deleteOne({ _id: existing._id });

      return res.status(200).json({
        ok: true,
        message: "Service deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting service:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to delete service.",
      });
    }
  }
);

export default router;
