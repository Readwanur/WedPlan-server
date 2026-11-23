import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI environment variable is required");
}

const client = new MongoClient(uri);
let dbInstance = null;

export async function connectToMongoDB() {
  if (dbInstance) {
    return { client, db: dbInstance };
  }
  await client.connect();
  dbInstance = client.db("wedplan");
  console.log("Connected to MongoDB (wedplan database)");

  // Ensure indexes on core collections
  try {
    await dbInstance.collection("user").createIndex({ email: 1 }, { unique: false });
    await dbInstance.collection("services").createIndex({ vendorId: 1, status: 1, isActive: 1 });
    await dbInstance.collection("services").createIndex({ category: 1, location: 1, price: 1 });
    await dbInstance.collection("bookings").createIndex({ serviceId: 1, eventDate: 1, status: 1 });
    await dbInstance.collection("bookings").createIndex({ customerId: 1, createdAt: -1 });
    await dbInstance.collection("bookings").createIndex({ vendorId: 1, createdAt: -1 });
    await dbInstance.collection("transactions").createIndex({ vendorId: 1, createdAt: -1 });
    await dbInstance.collection("transactions").createIndex({ stripeSessionId: 1 });
  } catch (err) {
    console.warn("Index initialization warning:", err.message);
  }

  return { client, db: dbInstance };
}

export function getDb() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call connectToMongoDB() first.");
  }
  return dbInstance;
}

export function getCollections() {
  const db = getDb();
  return {
    users: db.collection("user"),
    accounts: db.collection("account"),
    sessions: db.collection("session"),
    services: db.collection("services"),
    bookings: db.collection("bookings"),
    transactions: db.collection("transactions"),
  };
}

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
      doc.role === "vendor"
        ? doc.subscriptionPlan || "free"
        : doc.subscriptionPlan || "free",
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
