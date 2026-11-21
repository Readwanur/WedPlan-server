import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectToMongoDB } from "./src/config/db.js";
import {
  globalErrorHandler,
  notFoundHandler,
} from "./src/middleware/errorHandler.js";
import adminRouter from "./src/routes/admin.js";
import authRouter from "./src/routes/auth.js";
import bookingsRouter from "./src/routes/bookings.js";
import paymentsRouter, {
  handleStripeWebhook,
} from "./src/routes/payments.js";
import profileRouter from "./src/routes/profile.js";
import servicesRouter from "./src/routes/services.js";
import uploadRouter from "./src/routes/upload.js";
import { ensureSeedData } from "./src/seed.js";

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Stripe Webhook must receive raw Buffer body before express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// Standard JSON & URL-encoded body parsers (with 15mb limit for base64 image uploads)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Health check & root info
app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    name: "WedPlan Express Backend API",
    version: "1.0.0",
    status: "healthy",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    status: "up",
    timestamp: new Date().toISOString(),
  });
});

// Mount API route modules
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/services", servicesRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/upload", uploadRouter);

// 404 and Global Error Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

async function startServer() {
  try {
    await connectToMongoDB();
    await ensureSeedData();

    app.listen(PORT, () => {
      console.log(`WedPlan Express server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start WedPlan server:", error);
    process.exit(1);
  }
}

startServer();
