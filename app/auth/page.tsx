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

  const inputClass =
    'w-full bg-[#1a1714] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#7a7268] text-sm outline-none focus:border-[#c9440e] transition'

  return (
    <div className="min-h-screen bg-[#1a1714] flex flex-col items-center justify-center px-6">
      <a href="/" className="mb-10 text-4xl font-serif text-white tracking-tight">
        con<span className="text-[#c9440e]">a</span>tus
      </a>
      <div className="w-full max-w-sm bg-[#242018] border border-white/10 rounded-2xl p-8">
        <div className="flex bg-[#1a1714] rounded-full p-1 mb-8">
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'signup' ? 'bg-[#c9440e] text-white' : 'text-[#7a7268]'}`}
          >
            S'inscrire
          </button>
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'login' ? 'bg-[#c9440e] text-white' : 'text-[#7a7268]'}`}
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
                className={inputClass}
              />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7268] text-sm select-none">@</span>
                <input
                  type="text"
                  placeholder="nom d'utilisateur"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required={mode === 'signup'}
                  className={`${inputClass} pl-8`}
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
            className={inputClass}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className={inputClass}
          />
          {message && <p className="text-sm text-center text-[#c9440e]">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-[#c9440e] text-white py-3 rounded-full text-sm font-medium hover:opacity-90 transition mt-2 disabled:opacity-50"
          >
            {loading ? 'Chargement...' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
