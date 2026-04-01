import Stripe from 'stripe'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return Response.json({ error: 'STRIPE_SECRET_KEY manquante' }, { status: 500 })
    }

    const { plan, userId, userEmail } = await request.json()

    if (plan !== 'monthly' && plan !== 'yearly') {
      return Response.json({ error: `Plan invalide: ${plan}` }, { status: 400 })
    }

    if (!userId) {
      return Response.json({ error: 'userId manquant' }, { status: 400 })
    }

    const priceId = plan === 'yearly'
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY

    if (!priceId) {
      return Response.json(
        { error: `STRIPE_PRICE_${plan.toUpperCase()} manquante` },
        { status: 500 }
      )
    }

    const origin = request.headers.get('origin') ?? 'http://localhost:3000'
    const stripe = new Stripe(stripeKey)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      customer_email: userEmail,
      success_url: `${origin}/success`,
      cancel_url: `${origin}/premium`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
