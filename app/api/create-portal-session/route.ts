import Stripe from 'stripe'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return Response.json({ error: 'STRIPE_SECRET_KEY manquante' }, { status: 500 })

    const { userEmail } = await request.json()
    if (!userEmail) return Response.json({ error: 'userEmail manquant' }, { status: 400 })

    const stripe = new Stripe(stripeKey)
    const origin = request.headers.get('origin') ?? 'http://localhost:3000'

    // Trouver le client Stripe via son email
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 })
    if (!customers.data.length) {
      return Response.json({ error: 'Aucun compte Stripe trouvé pour cet email' }, { status: 404 })
    }
    const customer = customers.data[0]

    // Récupérer la date de renouvellement depuis l'abonnement actif
    let renewalDate: string | null = null
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })
    if (subscriptions.data.length) {
      const sub = subscriptions.data[0]
      renewalDate = new Date(sub.current_period_end * 1000).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/premium`,
    })

    return Response.json({ url: session.url, renewalDate })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
