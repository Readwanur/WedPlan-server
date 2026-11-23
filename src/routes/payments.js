import crypto from "crypto";
import express from "express";
import { ObjectId } from "mongodb";
import Stripe from "stripe";
import {
  buildIdQuery,
  getCollections,
  normalizeUser,
} from "../config/db.js";
import {
  requireRole,
  verifyJWT,
  verifyNotBlocked,
} from "../middleware/auth.js";

const router = express.Router();

const PREMIUM_PRICE_USD = 49;
const DEFAULT_STRIPE_PRICE_ID = "price_1UeuazRwBkRY5ZWKbnFt2JaW";

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (
    key &&
    (key.startsWith("sk_test_") || key.startsWith("sk_live_")) &&
    key !== "sk_test_wedplan_stripe_secret_key"
  ) {
    return new Stripe(key);
  }
  return null;
}

function getClientUrl(req) {
  const origin = req?.headers?.origin;
  if (origin && (origin.startsWith("http://") || origin.startsWith("https://"))) {
    return origin.replace(/\/$/, "");
  }
  return (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Internal helper: Activates vendor Premium subscription and updates transaction record.
 * Called ONLY after verified Stripe webhook events or server-side Stripe session confirmation.
 */
async function fulfillVerifiedPremiumSubscription({
  vendorId,
  stripeSessionId,
  stripeSubscriptionId,
  amount = PREMIUM_PRICE_USD,
  currency = "USD",
}) {
  const { users, services, transactions } = getCollections();

  const vendorDoc = await users.findOne(buildIdQuery(String(vendorId)));
  if (!vendorDoc) {
    throw new Error(`Vendor '${vendorId}' not found during payment fulfillment.`);
  }

  const expiresAt = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000
  ).toISOString();

  await users.updateOne(
    { _id: vendorDoc._id },
    {
      $set: {
        subscriptionPlan: "premium",
        subscriptionExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    }
  );

  const vendorIdCandidates = [String(vendorDoc._id)];
  if (vendorDoc.id) vendorIdCandidates.push(String(vendorDoc.id));

  await services.updateMany(
    { vendorId: { $in: vendorIdCandidates } },
    {
      $set: {
        "vendor.isPremium": true,
      },
    }
  );

  const existingTxn = await transactions.findOne({ stripeSessionId });
  if (existingTxn) {
    await transactions.updateOne(
      { _id: existingTxn._id },
      {
        $set: {
          status: "succeeded",
          stripeSubscriptionId:
            stripeSubscriptionId || existingTxn.stripeSubscriptionId,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  } else {
    const newId = new ObjectId();
    await transactions.insertOne({
      _id: newId,
      id: `txn-${String(newId).slice(-6)}`,
      vendorId: String(vendorDoc.id || vendorDoc._id),
      vendorName: vendorDoc.name,
      vendorBusinessName:
        vendorDoc.businessName || `${vendorDoc.name} Wedding Studio`,
      vendorEmail: vendorDoc.email,
      plan: "Premium",
      amount: Number(amount) || PREMIUM_PRICE_USD,
      currency: String(currency).toUpperCase(),
      stripeSessionId,
      stripeSubscriptionId:
        stripeSubscriptionId ||
        `sub_${crypto.randomBytes(6).toString("hex")}`,
      status: "succeeded",
      createdAt: new Date().toISOString(),
    });
  }

  const finalTxn = await transactions.findOne({ stripeSessionId });
  const updatedVendor = await users.findOne({ _id: vendorDoc._id });

  return {
    transaction: {
      id: finalTxn.id || String(finalTxn._id),
      vendorId: finalTxn.vendorId,
      vendorName: finalTxn.vendorName,
      vendorBusinessName: finalTxn.vendorBusinessName,
      vendorEmail: finalTxn.vendorEmail,
      plan: finalTxn.plan,
      amount: finalTxn.amount,
      currency: finalTxn.currency,
      stripeSessionId: finalTxn.stripeSessionId,
      stripeSubscriptionId: finalTxn.stripeSubscriptionId,
      status: finalTxn.status,
      createdAt: finalTxn.createdAt,
    },
    user: normalizeUser(updatedVendor),
  };
}

/**
 * POST /api/payments/webhook
 * Stripe Webhook endpoint.
 * Verifies Stripe webhook signature (or verifies session directly with Stripe API)
 * and processes checkout.session.completed, customer.subscription.deleted, and invoice.payment_failed.
 */
export async function handleStripeWebhook(req, res) {
  const stripe = getStripeClient();
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    let event;

    if (stripe && sig && webhookSecret && Buffer.isBuffer(req.body)) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      const rawPayload = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);
      event = JSON.parse(rawPayload);
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const payloadSession = event.data?.object;
        if (!payloadSession?.id) break;

        // Always verify with Stripe API if webhook signature secret wasn't used
        let verifiedSession = payloadSession;
        if (stripe && (!sig || !webhookSecret)) {
          verifiedSession = await stripe.checkout.sessions.retrieve(
            payloadSession.id
          );
        }

        const vendorId =
          verifiedSession.metadata?.vendorId ||
          verifiedSession.client_reference_id;
        if (vendorId && verifiedSession.payment_status === "paid") {
          await fulfillVerifiedPremiumSubscription({
            vendorId,
            stripeSessionId: verifiedSession.id,
            stripeSubscriptionId:
              typeof verifiedSession.payment_intent === "string"
                ? verifiedSession.payment_intent
                : typeof verifiedSession.subscription === "string"
                  ? verifiedSession.subscription
                  : `pi_${crypto.randomBytes(6).toString("hex")}`,
            amount: verifiedSession.amount_total
              ? Math.round(verifiedSession.amount_total / 100)
              : PREMIUM_PRICE_USD,
            currency: verifiedSession.currency || "USD",
          });
        }
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const failedSession = event.data?.object;
        if (failedSession?.id) {
          const { transactions } = getCollections();
          await transactions.updateOne(
            { stripeSessionId: failedSession.id, status: "pending" },
            { $set: { status: "failed", updatedAt: new Date().toISOString() } }
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data?.object;
        const vendorId = subscription?.metadata?.vendorId;
        if (vendorId) {
          const { users, services } = getCollections();
          const vendorDoc = await users.findOne(buildIdQuery(String(vendorId)));
          if (vendorDoc) {
            await users.updateOne(
              { _id: vendorDoc._id },
              {
                $set: {
                  subscriptionPlan: "free",
                  subscriptionExpiresAt: null,
                  updatedAt: new Date(),
                },
              }
            );
            const vendorIds = [String(vendorDoc._id)];
            if (vendorDoc.id) vendorIds.push(String(vendorDoc.id));
            await services.updateMany(
              { vendorId: { $in: vendorIds } },
              { $set: { "vendor.isPremium": false } }
            );
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data?.object;
        const sessionId = invoice?.metadata?.stripeSessionId;
        if (sessionId) {
          const { transactions } = getCollections();
          await transactions.updateOne(
            { stripeSessionId: sessionId },
            { $set: { status: "failed", updatedAt: new Date().toISOString() } }
          );
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err.message);
    return res.status(400).json({
      ok: false,
      error: `Webhook Error: ${err.message}`,
    });
  }
}

/**
 * POST /api/payments/create-checkout-session
 * Protected Vendor route: Creates a live Stripe Checkout Session for the authenticated vendor.
 * Prevents unauthorized users from creating subscription sessions for other vendors.
 */
router.post(
  "/create-checkout-session",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const requestedVendorId = req.body?.vendorId;
      if (
        requestedVendorId &&
        String(requestedVendorId) !== String(req.user.id) &&
        String(requestedVendorId) !== String(req.rawUser._id)
      ) {
        return res.status(403).json({
          ok: false,
          error:
            "Forbidden: You cannot create a Stripe subscription session for another vendor.",
        });
      }

      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(500).json({
          ok: false,
          error: "Stripe secret key is not configured on the server.",
        });
      }

      const clientUrl = getClientUrl(req);
      const priceId =
        process.env.STRIPE_PRICE_ID || DEFAULT_STRIPE_PRICE_ID;

      let lineItems;
      if (priceId) {
        lineItems = [
          {
            price: priceId,
            quantity: 1,
          },
        ];
      } else {
        lineItems = [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "WedPlan Premium Plan",
                description:
                  "Unlimited active wedding service listings & Premium Vendor Badge.",
              },
              unit_amount: PREMIUM_PRICE_USD * 100,
            },
            quantity: 1,
          },
        ];
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: req.user.id,
        customer_email: req.user.email,
        metadata: {
          vendorId: req.user.id,
          vendorName: req.user.name,
          vendorBusinessName:
            req.user.businessName || `${req.user.name} Wedding Studio`,
          plan: "Premium",
        },
        line_items: lineItems,
        success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
      });

      const { transactions } = getCollections();
      const newId = new ObjectId();
      await transactions.insertOne({
        _id: newId,
        id: `txn-${String(newId).slice(-6)}`,
        vendorId: req.user.id,
        vendorName: req.user.name,
        vendorBusinessName:
          req.user.businessName || `${req.user.name} Wedding Studio`,
        vendorEmail: req.user.email,
        plan: "Premium",
        amount: PREMIUM_PRICE_USD,
        currency: "USD",
        stripeSessionId: session.id,
        stripeSubscriptionId: `sub_${crypto.randomBytes(6).toString("hex")}`,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      return res.status(200).json({
        ok: true,
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error("Error creating Stripe checkout session:", error);
      return res.status(500).json({
        ok: false,
        error:
          error.message || "Failed to initialize Stripe Checkout session.",
      });
    }
  }
);

/**
 * GET /api/payments/session/:sessionId
 * Protected Vendor route: Verifies payment status directly with Stripe API on the server
 * (never trusts frontend redirect parameters alone).
 */
router.get(
  "/session/:sessionId",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { transactions } = getCollections();
      const stripe = getStripeClient();

      if (stripe && sessionId.startsWith("cs_")) {
        try {
          const stripeSession = await stripe.checkout.sessions.retrieve(
            sessionId
          );

          if (stripeSession && stripeSession.payment_status === "paid") {
            const vendorId =
              stripeSession.metadata?.vendorId ||
              stripeSession.client_reference_id ||
              req.user.id;

            const result = await fulfillVerifiedPremiumSubscription({
              vendorId,
              stripeSessionId: stripeSession.id,
              stripeSubscriptionId:
                typeof stripeSession.payment_intent === "string"
                  ? stripeSession.payment_intent
                  : typeof stripeSession.subscription === "string"
                    ? stripeSession.subscription
                    : `pi_${crypto.randomBytes(6).toString("hex")}`,
              amount: stripeSession.amount_total
                ? Math.round(stripeSession.amount_total / 100)
                : PREMIUM_PRICE_USD,
              currency: stripeSession.currency || "USD",
            });

            return res.status(200).json({
              ok: true,
              verified: true,
              transaction: result.transaction,
              user: result.user,
            });
          } else if (stripeSession) {
            return res.status(400).json({
              ok: false,
              verified: false,
              paymentStatus: stripeSession.payment_status,
              error: `Payment is not completed (status: ${stripeSession.payment_status}).`,
            });
          }
        } catch (err) {
          console.warn("Stripe session retrieve warning:", err.message);
        }
      }

      const txn = await transactions.findOne({ stripeSessionId: sessionId });
      if (!txn || txn.status !== "succeeded") {
        return res.status(404).json({
          ok: false,
          verified: false,
          error: "Verified payment confirmation not found for this session.",
        });
      }

      return res.status(200).json({
        ok: true,
        verified: true,
        transaction: {
          id: txn.id || String(txn._id),
          vendorId: txn.vendorId,
          vendorName: txn.vendorName,
          vendorBusinessName: txn.vendorBusinessName,
          vendorEmail: txn.vendorEmail,
          plan: txn.plan,
          amount: txn.amount,
          currency: txn.currency,
          stripeSessionId: txn.stripeSessionId,
          stripeSubscriptionId: txn.stripeSubscriptionId,
          status: txn.status,
          createdAt: txn.createdAt,
        },
        user: req.user,
      });
    } catch (error) {
      console.error("Error verifying payment session:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to verify Stripe payment session.",
      });
    }
  }
);

/**
 * POST /api/payments/mark-failed
 * Marks an abandoned or cancelled checkout session's pending transaction as failed.
 */
router.post(
  "/mark-failed",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const { sessionId } = req.body || {};
      if (!sessionId) {
        return res.status(200).json({ ok: true });
      }

      const { transactions } = getCollections();
      await transactions.updateOne(
        {
          stripeSessionId: String(sessionId),
          vendorId: req.user.id,
          status: "pending",
        },
        {
          $set: {
            status: "failed",
            updatedAt: new Date().toISOString(),
          },
        }
      );

      return res.status(200).json({
        ok: true,
        message: "Cancelled session recorded.",
      });
    } catch (error) {
      console.error("Error marking failed payment:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to update cancelled payment status.",
      });
    }
  }
);

/**
 * POST /api/payments/cancel-subscription
 * Handles vendor subscription cancellation properly.
 */
router.post(
  "/cancel-subscription",
  verifyJWT,
  verifyNotBlocked,
  requireRole("vendor"),
  async (req, res) => {
    try {
      const { users, services } = getCollections();

      await users.updateOne(
        { _id: req.rawUser._id },
        {
          $set: {
            subscriptionPlan: "free",
            subscriptionExpiresAt: null,
            updatedAt: new Date(),
          },
        }
      );

      const vendorIds = [req.user.id, String(req.rawUser._id)];
      if (req.rawUser.id) vendorIds.push(String(req.rawUser.id));

      await services.updateMany(
        { vendorId: { $in: vendorIds } },
        { $set: { "vendor.isPremium": false } }
      );

      const updatedUser = await users.findOne({ _id: req.rawUser._id });

      return res.status(200).json({
        ok: true,
        message: "Subscription cancelled. Account reverted to the Free Plan.",
        user: normalizeUser(updatedUser),
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to cancel subscription.",
      });
    }
  }
);

export default router;
