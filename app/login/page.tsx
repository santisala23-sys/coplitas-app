'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)
    
    // Buscamos si el usuario y contraseña coinciden en la base de datos
    const { data, error: dbError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('password', password)
      .single()

    if (data && !dbError) {
      // Guardamos el rol y el nombre para usarlos en el resto de la app
      Cookies.set('coplitas_role', data.role, { expires: 30 })
      Cookies.set('coplitas_user', data.username, { expires: 30 })
      Cookies.remove('app_pin') // Limpiamos el PIN viejo por las dudas
      
      router.push('/')
      router.refresh()
    } else {
      setError(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-sm text-center border border-gray-100">
        
        <h1 className="text-3xl font-bold mb-2 text-gray-800">¡Hola! 👋</h1>
        <p className="text-gray-500 mb-8">Ingresá a Coplitas para Crecer</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Usuario (ej: mica)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border p-3 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400 bg-gray-50"
            required
            autoFocus
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-3 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400 bg-gray-50"
            required
          />
          {error && <p className="text-red-500 text-sm font-medium">Usuario o contraseña incorrectos.</p>}
          <button 
            type="submit"
            disabled={loading}
            className="bg-purple-600 text-white p-3.5 rounded-xl font-bold hover:bg-purple-700 transition mt-2 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}