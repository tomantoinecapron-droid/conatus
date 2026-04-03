import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY manquante' }, { status: 500 })
    }

    const { text } = await request.json()
    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'text manquant' }, { status: 400 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Traduis cette biographie en français. Réponds uniquement avec le texte traduit, sans commentaire ni formatage.\n\n${text}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: err }, { status: 500 })
    }

    const data = await res.json()
    const translated = data.content?.[0]?.text || text
    return Response.json({ translated })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
