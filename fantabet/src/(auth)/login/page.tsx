'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string>('')

  const sendLink = async () => {
    setMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) setMsg(error.message)
    else setMsg('✅ Controlla la tua mail per il magic link.')
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Accedi</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tua@email.com"
        className="w-full border p-2 rounded"
      />
      <button onClick={sendLink} className="bg-black text-white px-4 py-2 rounded">Invia magic link</button>
      {!!msg && <p className="text-sm pt-2">{msg}</p>}
    </main>
  )
}
