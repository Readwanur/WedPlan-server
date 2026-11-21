import "dotenv/config";
import { MongoClient } from "mongodb";

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
