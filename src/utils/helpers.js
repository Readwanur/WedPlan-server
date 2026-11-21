import { ObjectId } from "mongodb";

/**
 * Normalizes a MongoDB user document into a clean client-safe User record
 * matching the required database schema:
 * name, email, image, role, isBlocked, businessName, subscriptionPlan, subscriptionExpiresAt
 */
export function normalizeUser(doc) {
  if (!doc) return null;
  const id = doc.id || (doc._id ? String(doc._id) : "");
  return {
    id,
    name: doc.name || "WedPlan User",
    email: doc.email || "",
    image:
      doc.image ||
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80",
    role: doc.role || "customer",
    isBlocked: Boolean(doc.isBlocked),
    phone: doc.phone || "",
    location: doc.location || "",
    bio: doc.bio || "",
    businessName:
      doc.businessName ||
      (doc.role === "vendor" ? `${doc.name || "Vendor"}'s Wedding Studio` : ""),
    subscriptionPlan:
      doc.role === "vendor" ? doc.subscriptionPlan || "free" : doc.subscriptionPlan || "free",
    subscriptionExpiresAt: doc.subscriptionExpiresAt || null,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Builds a MongoDB filter that matches either string `_id`, `ObjectId(_id)`, or `id` field
 */
export function buildIdQuery(rawId) {
  if (!rawId) return { _id: null };
  const conditions = [{ _id: rawId }, { id: rawId }];
  if (ObjectId.isValid(rawId) && String(new ObjectId(rawId)) === String(rawId)) {
    conditions.push({ _id: new ObjectId(rawId) });
  }
  return { $or: conditions };
}
