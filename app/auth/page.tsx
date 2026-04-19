'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username.toLowerCase().trim(),
          },
        },
      })
      if (error) {
        setMessage(error.message)
      } else if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username: username.toLowerCase().trim(),
          bio: '',
        })
        setMessage('Vérifie tes emails pour confirmer ton compte !')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/home'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#F7F4EE' }}>
      <a href="/" className="mb-10 text-4xl font-serif tracking-tight" style={{ color: '#1A1A2E' }}>
        con<span style={{ color: '#9A9690' }}>a</span>tus
      </a>
      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: '#EDEAE3', border: '1px solid #D5D0C8' }}>
        {/* Toggle mode */}
        <div className="flex rounded-full p-1 mb-8" style={{ background: '#F7F4EE' }}>
          <button
            onClick={() => setMode('signup')}
            className="flex-1 py-2 rounded-full text-sm font-medium transition"
            style={{
              background: mode === 'signup' ? '#1A1A2E' : 'transparent',
              color: mode === 'signup' ? '#F7F4EE' : '#9A9690',
            }}
          >
            S'inscrire
          </button>
          <button
            onClick={() => setMode('login')}
            className="flex-1 py-2 rounded-full text-sm font-medium transition"
            style={{
              background: mode === 'login' ? '#1A1A2E' : 'transparent',
              color: mode === 'login' ? '#F7F4EE' : '#9A9690',
            }}
          >
            Se connecter
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="Ton prénom"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                style={{ background: '#F7F4EE', border: '1px solid #D5D0C8', color: '#1A1A2E' }}
              />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm select-none" style={{ color: '#9A9690' }}>@</span>
                <input
                  type="text"
                  placeholder="nom d'utilisateur"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required={mode === 'signup'}
                  className="w-full rounded-xl pl-8 pr-4 py-3 text-sm outline-none transition"
                  style={{ background: '#F7F4EE', border: '1px solid #D5D0C8', color: '#1A1A2E' }}
                />
              </div>
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
            style={{ background: '#F7F4EE', border: '1px solid #D5D0C8', color: '#1A1A2E' }}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
            style={{ background: '#F7F4EE', border: '1px solid #D5D0C8', color: '#1A1A2E' }}
          />
          {message && <p className="text-sm text-center" style={{ color: '#1A1A2E' }}>{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-3 text-sm font-medium hover:opacity-90 transition mt-2 disabled:opacity-50"
            style={{ background: '#1A1A2E', color: '#F7F4EE', borderRadius: '6px' }}
          >
            {loading ? 'Chargement...' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
