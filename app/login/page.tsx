'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import Image from 'next/image' // Importamos el componente Image

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (pin === process.env.NEXT_PUBLIC_APP_PIN) {
      Cookies.set('app_pin', pin, { expires: 30 })
      router.push('/')
      router.refresh()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
        
        {/* Logo de Coplitas */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo.jpeg" // Ruta a la imagen en la carpeta public
            alt=""
            width={150} // Ancho en píxeles
            height={150} // Alto en píxeles (ajústalo si es necesario)
            className="rounded-full" // Opcional: para que se vea redondo
            priority // Carga la imagen rápido
          />
        </div>

        <h1 className="text-2xl font-bold mb-6 text-gray-800">Coplitas para Crecer</h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Ingresá el PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="border p-3 rounded-lg text-center text-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">PIN incorrecto, intentá de nuevo.</p>}
          <button 
            type="submit"
            className="bg-purple-600 text-white p-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}