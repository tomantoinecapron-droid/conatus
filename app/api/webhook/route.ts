import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // Vérification des variables d'environnement
  if (!stripeKey || !supabaseUrl || !serviceRoleKey || !webhookSecret) {
    console.error('[webhook] ENV manquantes:', {
      STRIPE_SECRET_KEY: !!stripeKey,
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceRoleKey,
      STRIPE_WEBHOOK_SECRET: !!webhookSecret,
    })
    return new Response('Missing environment variables', { status: 500 })
  }

  const stripe = new Stripe(stripeKey)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[webhook] stripe-signature header manquant')
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[webhook] Signature invalide:', err)
    return new Response('Invalid webhook signature', { status: 400 })
  }

  console.log('[webhook] event reçu:', event.type)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    console.log('[webhook] session.client_reference_id:', session.client_reference_id)
    console.log('[webhook] session.customer_email:', session.customer_email)
    console.log('[webhook] session.customer:', session.customer)

    const userId = session.client_reference_id
    if (!userId) {
      console.error('[webhook] client_reference_id absent de la session')
      return new Response('Missing client_reference_id', { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_pro: true })
      .eq('id', userId)
      .select('id, is_pro')

    if (error) {
      console.error('[webhook] Erreur Supabase update:', error)
      return new Response('Failed to update profile', { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error('[webhook] Aucune ligne mise à jour — userId introuvable dans profiles:', userId)
      return new Response('Profile not found', { status: 404 })
    }

    console.log('[webhook] is_pro mis à jour pour userId:', userId, '→', data)
  }

  return new Response('OK', { status: 200 })
}
