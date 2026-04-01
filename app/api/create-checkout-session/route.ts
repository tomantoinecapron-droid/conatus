import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 1. Env vars
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const priceMonthly = process.env.STRIPE_PRICE_MONTHLY
    const priceYearly = process.env.STRIPE_PRICE_YEARLY
    console.log('[checkout] env check — STRIPE_SECRET_KEY:', stripeKey ? '✓' : '✗ MISSING')
    console.log('[checkout] env check — STRIPE_PRICE_MONTHLY:', priceMonthly ?? '✗ MISSING')
    console.log('[checkout] env check — STRIPE_PRICE_YEARLY:', priceYearly ?? '✗ MISSING')

    if (!stripeKey) {
      return Response.json({ error: 'STRIPE_SECRET_KEY manquante' }, { status: 500 })
    }

    // 2. Parse body
    const body = await request.json()
    const { plan } = body
    console.log('[checkout] plan reçu:', plan)

    if (plan !== 'monthly' && plan !== 'yearly') {
      return Response.json({ error: `Plan invalide: ${plan}` }, { status: 400 })
    }

    // 3. Auth Supabase
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[checkout] user:', user?.id ?? 'null', '| authError:', authError?.message ?? 'none')

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 4. Price ID
    const priceId = plan === 'yearly' ? priceYearly : priceMonthly
    console.log('[checkout] priceId sélectionné:', priceId ?? '✗ MISSING')

    if (!priceId) {
      return Response.json(
        { error: `STRIPE_PRICE_${plan.toUpperCase()} manquante dans les variables d'environnement` },
        { status: 500 }
      )
    }

    // 5. Origin
    const origin = request.headers.get('origin') ?? request.headers.get('referer')?.replace(/\/$/, '') ?? 'http://localhost:3000'
    console.log('[checkout] origin:', origin)

    // 6. Création session Stripe
    const stripe = new Stripe(stripeKey)
    console.log('[checkout] création session Stripe...')

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${origin}/success`,
      cancel_url: `${origin}/premium`,
    })

    console.log('[checkout] session créée:', session.id, '| url:', session.url ? '✓' : '✗ null')

    return Response.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[checkout] ERREUR 500:', message)
    return Response.json({ error: message, stack }, { status: 500 })
  }
}
