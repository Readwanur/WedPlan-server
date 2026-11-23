import { app } from "../index.js";
import { connectToMongoDB } from "../src/config/db.js";

export default async function handler(req, res) {
  try {
    await connectToMongoDB();
  } catch (err) {
    console.error("MongoDB connection warning in Vercel serverless:", err);
  }
  return app(req, res);
}
