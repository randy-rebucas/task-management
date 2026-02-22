import { NextResponse } from "next/server";
import { withPermission } from "@/features/auth/api-helpers";
import { getPayPalAccessToken } from "@/lib/paypal";

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

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
  return data.id as string;
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
        {
          frequency: { interval_unit: "DAY", interval_count: 7 },
          tenure_type: "TRIAL",
          sequence: 1,
          total_cycles: 1,
          pricing_scheme: { fixed_price: { value: "0", currency_code: "USD" } },
        },
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 2,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: amount.toFixed(2), currency_code: "USD" },
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
  return data.id as string;
}

export const POST = withPermission("settings:manage", async () => {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in environment variables." },
      { status: 400 }
    );
  }

  try {
    const token = await getPayPalAccessToken();
    const productId = await createProduct(token);

    const [starterId, growthId, businessId] = await Promise.all([
      createPlan(token, productId, "TaskMgr Starter",  "Up to 10 team members",  49),
      createPlan(token, productId, "TaskMgr Growth",   "Up to 30 team members",  149),
      createPlan(token, productId, "TaskMgr Business", "Up to 100 team members", 299),
    ]);
    await Promise.all([
      models.AppSetting.findOneAndUpdate({ key: "paypal.product.id" },      { value: productId  }, { upsert: true }),
      models.AppSetting.findOneAndUpdate({ key: "paypal.plan.starter.id" }, { value: starterId  }, { upsert: true }),
      models.AppSetting.findOneAndUpdate({ key: "paypal.plan.growth.id" },  { value: growthId   }, { upsert: true }),
      models.AppSetting.findOneAndUpdate({ key: "paypal.plan.business.id" },{ value: businessId }, { upsert: true }),
    ]);

    return NextResponse.json({
      ok: true,
      productId,
      starter:  starterId,
      growth:   growthId,
      business: businessId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayPal setup failed" },
      { status: 500 }
    );
  }
});
