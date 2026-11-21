import express from "express";
import { getCollections } from "../config/db.js";
import {
  requireRole,
  verifyJWT,
  verifyNotBlocked,
} from "../middleware/auth.js";
import { buildIdQuery, normalizeUser } from "../utils/helpers.js";

const router = express.Router();

// Protect all Admin routes with JWT + not blocked + Admin role check
router.use(verifyJWT, verifyNotBlocked, requireRole("admin"));

function normalizeAdminService(doc, vendorDoc = null) {
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
      (doc.description ? doc.description.slice(0, 140) : ""),
    highlights: Array.isArray(doc.highlights) ? doc.highlights : [],
    price: Number(doc.price) || 0,
    priceUnit: doc.priceUnit || "Complete Package",
    location: doc.location || "Dhaka",
    images:
      Array.isArray(doc.images) && doc.images.length > 0
        ? doc.images
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
        "Vendor Studio",
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

function normalizeTransaction(doc, vendorDoc = null) {
  const id = doc.id || (doc._id ? String(doc._id) : "");
  return {
    id,
    vendorId: String(doc.vendorId || ""),
    vendorName: vendorDoc?.name || doc.vendorName || "Wedding Vendor",
    vendorBusinessName:
      vendorDoc?.businessName ||
      doc.vendorBusinessName ||
      vendorDoc?.name ||
      "Vendor Studio",
    vendorEmail: vendorDoc?.email || doc.vendorEmail || "vendor@wedplan.com",
    plan: doc.plan || "Premium",
    amount: Number(doc.amount) || 49,
    currency: doc.currency || "USD",
    stripeSessionId: doc.stripeSessionId || "",
    stripeSubscriptionId: doc.stripeSubscriptionId || "",
    status: doc.status || "succeeded",
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * GET /api/admin/overview
 * Returns the 6 required Admin Overview statistics:
 * Total Registered Users, Total Vendors, Total Customers, Total Services, Pending Services, Total Transactions
 */
router.get("/overview", async (req, res) => {
  try {
    const { users, services, transactions } = getCollections();

    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalServices,
      pendingServices,
      totalTransactions,
    ] = await Promise.all([
      users.countDocuments({}),
      users.countDocuments({ role: "vendor" }),
      users.countDocuments({ $or: [{ role: "customer" }, { role: { $exists: false } }] }),
      services.countDocuments({}),
      services.countDocuments({ status: "pending" }),
      transactions.countDocuments({}),
    ]);

    return res.status(200).json({
      ok: true,
      stats: {
        totalUsers,
        totalVendors,
        totalCustomers,
        totalServices,
        pendingServices,
        totalTransactions,
      },
    });
  } catch (error) {
    console.error("Error fetching admin overview stats:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to load admin overview statistics.",
    });
  }
});

/**
 * GET /api/admin/users
 * Admin can: View All Registered Users, Search Users by Name or Email, Filter Users by Role
 */
router.get("/users", async (req, res) => {
  try {
    const { search, role } = req.query;
    const { users } = getCollections();

    const query = {};
    if (role && role !== "All") {
      const normalizedRole = String(role).toLowerCase();
      if (normalizedRole === "customer") {
        query.$or = [{ role: "customer" }, { role: { $exists: false } }];
      } else {
        query.role = normalizedRole;
      }
    }

    if (search && String(search).trim()) {
      const escaped = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      const searchOr = [
        { name: regex },
        { email: regex },
        { businessName: regex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const docs = await users.find(query).sort({ createdAt: -1 }).toArray();
    const normalized = docs.map(normalizeUser);

    return res.status(200).json({
      ok: true,
      count: normalized.length,
      users: normalized,
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to load registered users.",
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Admin can: View User Details
 */
router.get("/users/:id", async (req, res) => {
  try {
    const { users } = getCollections();
    const userDoc = await users.findOne(buildIdQuery(req.params.id));
    if (!userDoc) {
      return res.status(404).json({
        ok: false,
        error: "User not found.",
      });
    }
    return res.status(200).json({
      ok: true,
      user: normalizeUser(userDoc),
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to fetch user details.",
    });
  }
});

/**
 * PATCH /api/admin/users/:id/block
 * Admin can: Block User / Unblock User
 * Blocked users must not be able to access protected platform features.
 */
router.patch("/users/:id/block", async (req, res) => {
  try {
    const rawId = req.params.id;
    const { users } = getCollections();

    const target = await users.findOne(buildIdQuery(rawId));
    if (!target) {
      return res.status(404).json({
        ok: false,
        error: "User not found.",
      });
    }

    if (target.role === "admin") {
      return res.status(403).json({
        ok: false,
        error: "Administrator accounts cannot be blocked.",
      });
    }

    const nextBlocked =
      req.body?.isBlocked !== undefined
        ? Boolean(req.body.isBlocked)
        : !Boolean(target.isBlocked);

    await users.updateOne(
      { _id: target._id },
      {
        $set: {
          isBlocked: nextBlocked,
          updatedAt: new Date(),
        },
      }
    );

    const updated = await users.findOne({ _id: target._id });

    return res.status(200).json({
      ok: true,
      isBlocked: nextBlocked,
      message: nextBlocked
        ? `User ${updated.name} has been blocked.`
        : `User ${updated.name} has been unblocked.`,
      user: normalizeUser(updated),
    });
  } catch (error) {
    console.error("Error blocking/unblocking user:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to update user block status.",
    });
  }
});

/**
 * GET /api/admin/services
 * Admin can: View All Submitted Services, Search and Filter Services, Review Pending Services
 */
router.get("/services", async (req, res) => {
  try {
    const { search, status, category } = req.query;
    const { services, users } = getCollections();

    const query = {};
    if (status && status !== "All") {
      query.status = String(status).toLowerCase();
    }
    if (category && category !== "All") {
      query.category = String(category);
    }
    if (search && String(search).trim()) {
      const escaped = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      query.$or = [
        { serviceName: regex },
        { location: regex },
        { category: regex },
        { "vendor.businessName": regex },
        { "vendor.name": regex },
      ];
    }

    const [serviceDocs, userDocs] = await Promise.all([
      services.find(query).sort({ createdAt: -1 }).toArray(),
      users.find({}).toArray(),
    ]);

    const userMap = new Map();
    for (const u of userDocs) {
      if (u._id) userMap.set(String(u._id), u);
      if (u.id) userMap.set(String(u.id), u);
    }

    const normalized = serviceDocs.map((doc) =>
      normalizeAdminService(doc, userMap.get(String(doc.vendorId)) || null)
    );

    return res.status(200).json({
      ok: true,
      count: normalized.length,
      services: normalized,
    });
  } catch (error) {
    console.error("Error fetching admin services:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to load submitted services.",
    });
  }
});

/**
 * PATCH /api/admin/services/:id/status
 * Admin can: Approve Services, Reject Services, Change Status of Published Services When Necessary
 */
router.patch("/services/:id/status", async (req, res) => {
  try {
    const rawId = req.params.id;
    const { status } = req.body || {};

    if (!["approved", "pending", "rejected"].includes(status)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid status. Must be 'approved', 'pending', or 'rejected'.",
      });
    }

    const { services, users } = getCollections();
    const existing = await services.findOne(buildIdQuery(rawId));
    if (!existing) {
      return res.status(404).json({
        ok: false,
        error: "Service not found.",
      });
    }

    const updates = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === "rejected") {
      updates.isActive = false;
    } else if (status === "approved" && existing.status === "pending") {
      updates.isActive = true;
    }

    await services.updateOne({ _id: existing._id }, { $set: updates });
    const updatedDoc = await services.findOne({ _id: existing._id });
    const vendorDoc = await users.findOne(
      buildIdQuery(String(updatedDoc.vendorId))
    );

    return res.status(200).json({
      ok: true,
      message: `Service status updated to '${status}'.`,
      service: normalizeAdminService(updatedDoc, vendorDoc),
    });
  } catch (error) {
    console.error("Error updating service status:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to update service status.",
    });
  }
});

/**
 * DELETE /api/admin/services/:id
 * Admin can: Delete Inappropriate Services
 */
router.delete("/services/:id", async (req, res) => {
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

    await services.deleteOne({ _id: existing._id });

    return res.status(200).json({
      ok: true,
      message: "Service permanently deleted by administrator.",
    });
  } catch (error) {
    console.error("Error deleting service by admin:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to delete service.",
    });
  }
});

/**
 * GET /api/admin/transactions
 * Admin can: View Platform Transactions (Vendor Info, Subscription Plan, Payment Amount, Payment Status, Transaction Date).
 * Rule: Admin must not be able to modify payment records manually to mark an unsuccessful payment as successful.
 */
router.get("/transactions", async (req, res) => {
  try {
    const { transactions, users } = getCollections();
    const [txnDocs, userDocs] = await Promise.all([
      transactions.find({}).sort({ createdAt: -1 }).toArray(),
      users.find({}).toArray(),
    ]);

    const userMap = new Map();
    for (const u of userDocs) {
      if (u._id) userMap.set(String(u._id), u);
      if (u.id) userMap.set(String(u.id), u);
    }

    const normalized = txnDocs.map((doc) =>
      normalizeTransaction(doc, userMap.get(String(doc.vendorId)) || null)
    );

    return res.status(200).json({
      ok: true,
      count: normalized.length,
      transactions: normalized,
    });
  } catch (error) {
    console.error("Error fetching admin transactions:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to load platform transactions.",
    });
  }
});

export default router;
