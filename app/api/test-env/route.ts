export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY
  return Response.json({
    STRIPE_SECRET_KEY_exists: !!key,
    STRIPE_SECRET_KEY_prefix: key ? key.slice(0, 5) : null,
    STRIPE_PRICE_MONTHLY_exists: !!process.env.STRIPE_PRICE_MONTHLY,
    STRIPE_PRICE_YEARLY_exists: !!process.env.STRIPE_PRICE_YEARLY,
    NODE_ENV: process.env.NODE_ENV,
  })
}
