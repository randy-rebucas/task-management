/**
 * One-time script to create PayPal Products and Billing Plans
 * for TaskMgr's subscription tiers.
 *
 * Usage:
 *   npx tsx scripts/setup-paypal-plans.ts
 *
 * After running, copy the plan IDs printed to the console
 * and add them to your .env file:
 *   PAYPAL_PLAN_STARTER_ID=P-XXXX
 *   PAYPAL_PLAN_GROWTH_ID=P-XXXX
 *   PAYPAL_PLAN_BUSINESS_ID=P-XXXX
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get PayPal access token");
  return data.access_token;
}

async function createProduct(token: string): Promise<string> {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "TaskMgr Subscription",
      description: "All-in-one task management, CRM, KPI & field monitoring platform",
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });

  const data = await res.json();
  if (!data.id) throw new Error(`Failed to create product: ${JSON.stringify(data)}`);
  console.log(`✓ Product created: ${data.id}`);
  return data.id;
}

async function createPlan(
  token: string,
  productId: string,
  name: string,
  description: string,
  amount: number
): Promise<string> {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      name,
      description,
      status: "ACTIVE",
      billing_cycles: [
        // 7-day free trial
        {
          frequency: { interval_unit: "DAY", interval_count: 7 },
          tenure_type: "TRIAL",
          sequence: 1,
          total_cycles: 1,
          pricing_scheme: {
            fixed_price: { value: "0", currency_code: "USD" },
          },
        },
        // Regular monthly billing
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 2,
          total_cycles: 0, // 0 = infinite
          pricing_scheme: {
            fixed_price: {
              value: amount.toFixed(2),
              currency_code: "USD",
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: "0", currency_code: "USD" },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });

  const data = await res.json();
  if (!data.id) throw new Error(`Failed to create plan "${name}": ${JSON.stringify(data)}`);
  console.log(`✓ Plan "${name}" created: ${data.id}`);
  return data.id;
}

async function main() {
  console.log(`\n🚀 Setting up PayPal plans (${process.env.PAYPAL_ENV ?? "sandbox"})...\n`);

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env.local");
  }

  const token = await getAccessToken();
  console.log("✓ Access token obtained\n");

  const productId = await createProduct(token);

  const [starterId, growthId, businessId] = await Promise.all([
    createPlan(token, productId, "TaskMgr Starter", "Up to 10 team members", 49),
    createPlan(token, productId, "TaskMgr Growth", "Up to 30 team members", 149),
    createPlan(token, productId, "TaskMgr Business", "Up to 100 team members", 299),
  ]);

  console.log("\n✅ Done! Add these to your .env.local file:\n");
  console.log(`PAYPAL_PLAN_STARTER_ID=${starterId}`);
  console.log(`PAYPAL_PLAN_GROWTH_ID=${growthId}`);
  console.log(`PAYPAL_PLAN_BUSINESS_ID=${businessId}`);
  console.log("\nAlso make sure these are set:");
  console.log("NEXT_PUBLIC_PAYPAL_CLIENT_ID=<your PayPal client ID>");
  console.log("PAYPAL_WEBHOOK_ID=<from PayPal Developer Dashboard>");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
