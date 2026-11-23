import express from "express";
import { ObjectId } from "mongodb";
import { buildIdQuery, getCollections } from "../config/db.js";
import {
  requireRole,
  verifyJWT,
  verifyNotBlocked,
} from "../middleware/auth.js";

const router = express.Router();

function normalizeBooking(doc, serviceDoc = null, vendorDoc = null, customerDoc = null) {
  if (!doc) return null;
  const id = doc.id || (doc._id ? String(doc._id) : "");

  return {
    id,
    serviceId: String(doc.serviceId || ""),
    vendorId: String(doc.vendorId || ""),
    customerId: String(doc.customerId || ""),
    eventDate: doc.eventDate || "",
    eventLocation: doc.eventLocation || "",
    message: doc.message || "",
    status: doc.status || "Pending",
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
    // Display fields populated from related collections or snapshot
    serviceName:
      serviceDoc?.serviceName || doc.serviceName || "Wedding Service Package",
    serviceImage:
      (Array.isArray(serviceDoc?.images) && serviceDoc.images[0]) ||
      doc.serviceImage ||
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    serviceCategory:
      serviceDoc?.category || doc.serviceCategory || "Wedding Venues",
    servicePrice: Number(serviceDoc?.price ?? doc.servicePrice) || 0,
    vendorName:
      vendorDoc?.name ||
      serviceDoc?.vendor?.name ||
      doc.vendorName ||
      "Wedding Vendor",
    vendorBusinessName:
      vendorDoc?.businessName ||
      serviceDoc?.vendor?.businessName ||
      doc.vendorBusinessName ||
      vendorDoc?.name ||
      "Vendor Studio",
    vendorEmail:
      vendorDoc?.email ||
      serviceDoc?.vendor?.email ||
      doc.vendorEmail ||
      "vendor@wedplan.com",
    vendorPhone:
      vendorDoc?.phone ||
      serviceDoc?.vendor?.phone ||
      doc.vendorPhone ||
      "+8801711223344",
    customerName: customerDoc?.name || doc.customerName || "WedPlan Customer",
    customerEmail: customerDoc?.email || doc.customerEmail || "",
    customerAvatar:
      customerDoc?.image ||
      doc.customerAvatar ||
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80",
  };
}

async function populateBookings(bookingDocs) {
  if (!bookingDocs || bookingDocs.length === 0) return [];
  const { services, users } = getCollections();

  const [allServices, allUsers] = await Promise.all([
    services.find({}).toArray(),
    users.find({}).toArray(),
  ]);

  const serviceMap = new Map();
  for (const s of allServices) {
    if (s._id) serviceMap.set(String(s._id), s);
    if (s.id) serviceMap.set(String(s.id), s);
  }

  const userMap = new Map();
  for (const u of allUsers) {
    if (u._id) userMap.set(String(u._id), u);
    if (u.id) userMap.set(String(u.id), u);
  }

  return bookingDocs.map((doc) => {
    const sDoc = serviceMap.get(String(doc.serviceId)) || null;
    const vDoc = userMap.get(String(doc.vendorId)) || null;
    const cDoc = userMap.get(String(doc.customerId)) || null;
    return normalizeBooking(doc, sDoc, vDoc, cDoc);
  });
}

/**
 * POST /api/bookings
 * Customer submits a booking request for an approved and active service.
 * Rules:
 * - Customers must be authenticated
 * - Admins cannot submit customer booking requests
 * - Vendors cannot book their own services (and only customer role can book)
 * - Only approved and active services are available for booking
 * - Prevent duplicate active booking requests (Pending or Accepted) for the same service and event date
 */
router.post("/", verifyJWT, verifyNotBlocked, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({
        ok: false,
        error: "Admins cannot submit customer booking requests.",
      });
    }

    const { serviceId, eventDate, eventLocation, message } = req.body || {};

    if (!serviceId || !eventDate || !eventLocation || !String(eventLocation).trim()) {
      return res.status(400).json({
        ok: false,
        error: "serviceId, eventDate, and eventLocation are required.",
      });
    }

    const { services, bookings, users } = getCollections();

    const serviceDoc = await services.findOne(buildIdQuery(String(serviceId)));
    if (!serviceDoc) {
      return res.status(404).json({
        ok: false,
        error: "Selected wedding service does not exist.",
      });
    }

    // Rule: Prevent vendors/customers from booking their own services
    const requesterIds = [req.user.id, String(req.rawUser._id)];
    if (req.rawUser.id) requesterIds.push(String(req.rawUser.id));

    if (
      requesterIds.includes(String(serviceDoc.vendorId)) ||
      (serviceDoc.vendor?.email &&
        serviceDoc.vendor.email.toLowerCase() === req.user.email.toLowerCase())
    ) {
      return res.status(403).json({
        ok: false,
        error: "Vendors cannot book their own wedding services.",
      });
    }

    if (req.user.role !== "customer") {
      return res.status(403).json({
        ok: false,
        error: "Only customer accounts can submit wedding booking requests.",
      });
    }

    // Rule: Only approved and active services are available for booking
    if (serviceDoc.status !== "approved" || !serviceDoc.isActive) {
      return res.status(400).json({
        ok: false,
        error: "Only approved and active services are available for booking.",
      });
    }

    const canonicalServiceId = String(serviceDoc.id || serviceDoc._id);
    const serviceIdCandidates = [
      canonicalServiceId,
      String(serviceDoc._id),
      ...(serviceDoc.id ? [String(serviceDoc.id)] : []),
    ];
    const cleanDate = String(eventDate).trim();

    // Rule: Prevent duplicate active booking requests for the same service and event date
    const existingActiveBooking = await bookings.findOne({
      serviceId: { $in: serviceIdCandidates },
      eventDate: cleanDate,
      status: { $in: ["Pending", "Accepted"] },
    });

    if (existingActiveBooking) {
      return res.status(409).json({
        ok: false,
        error:
          "An active booking request already exists for this service on the selected event date.",
      });
    }

    const vendorDoc = await users.findOne(
      buildIdQuery(String(serviceDoc.vendorId))
    );

    const newObjectId = new ObjectId();
    const newBookingDoc = {
      _id: newObjectId,
      id: `bkg-${String(newObjectId).slice(-6)}`,
      serviceId: canonicalServiceId,
      vendorId: String(serviceDoc.vendorId),
      customerId: req.user.id,
      eventDate: cleanDate,
      eventLocation: String(eventLocation).trim(),
      message:
        message && String(message).trim()
          ? String(message).trim()
          : "Interested in booking this wedding package for our event.",
      // Default Status: Pending
      status: "Pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Snapshot display helpers
      serviceName: serviceDoc.serviceName,
      serviceImage:
        (Array.isArray(serviceDoc.images) && serviceDoc.images[0]) || "",
      serviceCategory: serviceDoc.category,
      servicePrice: Number(serviceDoc.price) || 0,
      vendorName: vendorDoc?.name || serviceDoc.vendor?.name || "Wedding Vendor",
      vendorBusinessName:
        vendorDoc?.businessName ||
        serviceDoc.vendor?.businessName ||
        "Vendor Studio",
      vendorEmail:
        vendorDoc?.email || serviceDoc.vendor?.email || "vendor@wedplan.com",
      vendorPhone:
        vendorDoc?.phone || serviceDoc.vendor?.phone || "+8801711223344",
      customerName: req.user.name,
      customerEmail: req.user.email,
      customerAvatar: req.user.image,
    };

    await bookings.insertOne(newBookingDoc);
    const populated = normalizeBooking(
      newBookingDoc,
      serviceDoc,
      vendorDoc,
      req.rawUser
    );

    return res.status(201).json({
      ok: true,
      message: "Booking request submitted successfully.",
      booking: populated,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to submit booking request.",
    });
  }
});

/**
 * GET /api/bookings/customer
 * Customer Dashboard: returns all booking requests submitted by the logged-in customer.
 */
router.get(
  "/customer",
  verifyJWT,
  verifyNotBlocked,
  requireRole("customer"),
  async (req, res) => {
    try {
      const { bookings } = getCollections();
      const customerIdCandidates = [req.user.id, String(req.rawUser._id)];
      if (req.rawUser.id) customerIdCandidates.push(String(req.rawUser.id));

      const docs = await bookings
        .find({
          $or: [
            { customerId: { $in: customerIdCandidates } },
            { customerEmail: req.user.email },
          ],
        })
        .sort({ createdAt: -1 })
        .toArray();

      const populated = await populateBookings(docs);

      return res.status(200).json({
        ok: true,
        bookings: populated,
        stats: {
          total: populated.length,
          pending: populated.filter((b) => b.status === "Pending").length,
          accepted: populated.filter((b) => b.status === "Accepted").length,
          rejected: populated.filter((b) => b.status === "Rejected").length,
          cancelled: populated.filter((b) => b.status === "Cancelled").length,
        },
      });
    } catch (error) {
      console.error("Error fetching customer bookings:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to fetch customer bookings.",
      });
    }
  }
);

/**
 * PATCH /api/bookings/:id/cancel
 * Customer cancels a Pending booking request.
 * Rules:
 * - Customers cannot modify or cancel another customer's bookings
 * - Customers cannot cancel an already accepted, rejected, or cancelled booking
 */
router.patch(
  "/:id/cancel",
  verifyJWT,
  verifyNotBlocked,
  requireRole("customer"),
  async (req, res) => {
    try {
      const rawId = req.params.id;
      const { bookings } = getCollections();

      const bookingDoc = await bookings.findOne(buildIdQuery(rawId));
      if (!bookingDoc) {
        return res.status(404).json({
          ok: false,
          error: "Booking record not found.",
        });
      }

      const customerIdCandidates = [req.user.id, String(req.rawUser._id)];
      if (req.rawUser.id) customerIdCandidates.push(String(req.rawUser.id));

      const isOwner =
        customerIdCandidates.includes(String(bookingDoc.customerId)) ||
        (bookingDoc.customerEmail &&
          bookingDoc.customerEmail.toLowerCase() ===
            req.user.email.toLowerCase());

      if (!isOwner) {
        return res.status(403).json({
          ok: false,
          error:
            "Forbidden: Customers cannot modify or cancel another customer's bookings.",
        });
      }

      if (bookingDoc.status !== "Pending") {
        return res.status(400).json({
          ok: false,
          error:
            "Customers cannot cancel an already accepted, rejected, or cancelled booking.",
        });
      }

      await bookings.updateOne(
        { _id: bookingDoc._id },
        {
          $set: {
            status: "Cancelled",
            updatedAt: new Date().toISOString(),
          },
        }
      );

      const updatedDoc = await bookings.findOne({ _id: bookingDoc._id });
      const [populated] = await populateBookings([updatedDoc]);

      return res.status(200).json({
        ok: true,
        message: "Pending booking request cancelled.",
        booking: populated,
      });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to cancel booking request.",
      });
    }
  }
);

/**
 * GET /api/bookings/vendor
 * Vendor Dashboard: returns booking requests for the logged-in vendor's services.
 */
router.get(
  "/vendor",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const { bookings } = getCollections();
      const vendorIdCandidates = [req.user.id, String(req.rawUser._id)];
      if (req.rawUser.id) vendorIdCandidates.push(String(req.rawUser.id));

      const docs = await bookings
        .find({ vendorId: { $in: vendorIdCandidates } })
        .sort({ createdAt: -1 })
        .toArray();

      const populated = await populateBookings(docs);

      return res.status(200).json({
        ok: true,
        bookings: populated,
        stats: {
          total: populated.length,
          pending: populated.filter((b) => b.status === "Pending").length,
          accepted: populated.filter((b) => b.status === "Accepted").length,
          rejected: populated.filter((b) => b.status === "Rejected").length,
        },
      });
    } catch (error) {
      console.error("Error fetching vendor bookings:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to fetch vendor booking requests.",
      });
    }
  }
);

/**
 * PATCH /api/bookings/:id/status
 * Vendor accepts or rejects a Pending booking request.
 * Rules:
 * - Only pending requests can be accepted or rejected
 * - Once accepted or rejected, a request cannot be processed again
 * - Vendors cannot modify booking requests belonging to other vendors
 */
router.patch(
  "/:id/status",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const rawId = req.params.id;
      const { status } = req.body || {};

      if (status !== "Accepted" && status !== "Rejected") {
        return res.status(400).json({
          ok: false,
          error: "Invalid decision: status must be 'Accepted' or 'Rejected'.",
        });
      }

      const { bookings } = getCollections();
      const bookingDoc = await bookings.findOne(buildIdQuery(rawId));
      if (!bookingDoc) {
        return res.status(404).json({
          ok: false,
          error: "Booking request not found.",
        });
      }

      const vendorIdCandidates = [req.user.id, String(req.rawUser._id)];
      if (req.rawUser.id) vendorIdCandidates.push(String(req.rawUser.id));

      if (!vendorIdCandidates.includes(String(bookingDoc.vendorId))) {
        return res.status(403).json({
          ok: false,
          error:
            "Forbidden: Vendors cannot modify booking requests belonging to other vendors.",
        });
      }

      if (bookingDoc.status !== "Pending") {
        return res.status(400).json({
          ok: false,
          error:
            "Only pending requests can be accepted or rejected. Once accepted or rejected, a request cannot be processed again.",
        });
      }

      await bookings.updateOne(
        { _id: bookingDoc._id },
        {
          $set: {
            status,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      const updatedDoc = await bookings.findOne({ _id: bookingDoc._id });
      const [populated] = await populateBookings([updatedDoc]);

      return res.status(200).json({
        ok: true,
        message: `Booking request ${status.toLowerCase()}.`,
        booking: populated,
      });
    } catch (error) {
      console.error("Error updating booking status:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to process booking request.",
      });
    }
  }
);

export default router;
