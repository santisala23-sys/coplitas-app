'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validamos contra la variable de entorno
    if (pin === process.env.NEXT_PUBLIC_APP_PIN) {
      // Guardamos la cookie por 30 días
      Cookies.set('app_pin', pin, { expires: 30 })
      router.push('/')
      router.refresh()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Coplitas para Crecer</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Ingresá el PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="border p-3 rounded-lg text-center text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">PIN incorrecto, intentá de nuevo.</p>}
          <button 
            type="submit"
            className="bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}