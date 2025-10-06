'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const send = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setMessage(error ? error.message : '✅ Controlla la mail per il link di accesso!')
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Entra in Fantabet</h1>
      <input
        className="border p-2 w-full mb-3"
        placeholder="Inserisci la tua email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={send}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Invia link
      </button>
      <p className="mt-3 text-sm">{message}</p>
    </div>
  )
}
