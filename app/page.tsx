'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Cookies from 'js-cookie'

export default function HomePage() {
  const [stats, setStats] = useState({ canciones: 0, planis: 0, tareas: 0, sedes: 0, materiales: 0 })
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      const role = Cookies.get('coplitas_role') || 'USER'
      setUserRole(role)

      // Contadores globales
      const { count: cancionesCount } = await supabase.from('canciones').select('*', { count: 'exact', head: true })
      const { count: planisCount } = await supabase.from('planificaciones').select('*', { count: 'exact', head: true })
      
      // Contador de Materiales
      const { count: materialesCount } = await supabase.from('materiales').select('*', { count: 'exact', head: true })

      // Contador de Sedes (solo nos importan las ACTIVAS para mostrar en la tarjeta)
      let sedesCount = 0
      if (role === 'ADMIN') {
        const { count } = await supabase.from('sedes').select('*', { count: 'exact', head: true }).eq('estado', 'ACTIVA')
        sedesCount = count || 0
      }

      // Contador de Tareas (solo las pendientes del usuario logueado)
      const currentUser = Cookies.get('coplitas_user')
      let tareasCount = 0

      if (currentUser) {
        const { count } = await supabase
          .from('tareas')
          .select('*', { count: 'exact', head: true })
          .eq('asignado_a', currentUser)
          .eq('completada', false)
        
        tareasCount = count || 0
      }

      setStats({
        canciones: cancionesCount || 0,
        planis: planisCount || 0,
        tareas: tareasCount,
        sedes: sedesCount,
        materiales: materialesCount || 0
      })
      setLoading(false)
    }
    
    fetchStats()
  }, [])

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen flex flex-col justify-center">
      
      {/* Mensaje de Bienvenida */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">¡Hola! </h1>
        <p className="text-lg md:text-xl text-gray-600">Panel de control de Coplitas.</p>
      </div>

      {/* Grilla de Módulos Activos (Orden modificado) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        
        {/* 1. Tareas */}
        <Link href="/tareas" className="bg-white p-8 rounded-3xl shadow-sm border border-orange-100 hover:shadow-lg hover:border-orange-300 transition-all group flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Tareas</h2>
          <p className="text-gray-500 mb-6 flex-grow">Gestión de pendientes y pedidos de materiales.</p>
          <div className={`${stats.tareas > 0 ? 'bg-orange-100' : 'bg-gray-100'} w-full py-3 rounded-xl transition-colors`}>
            {loading ? ( <div className="flex justify-center"><div className="w-5 h-5 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div></div> ) : ( <p className={`${stats.tareas > 0 ? 'text-orange-700' : 'text-gray-500'} font-medium`}>{stats.tareas > 0 ? ( <>Tenés <strong className="text-lg">{stats.tareas}</strong> pendiente(s)</> ) : ( <>Todo al día.</> )}</p> )}
          </div>
        </Link>

        {/* 2. Materiales (Inventario) */}
        <Link href="/inventario" className="bg-white p-8 rounded-3xl shadow-sm border border-blue-100 hover:shadow-lg hover:border-blue-300 transition-all group flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Materiales</h2>
          <p className="text-gray-500 mb-6 flex-grow">Stock general y movimientos entre sedes.</p>
          <div className="bg-blue-100/50 w-full py-3 rounded-xl">
            {loading ? ( <div className="flex justify-center"><div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div></div> ) : ( <p className="text-blue-700 font-medium"><strong className="text-lg">{stats.materiales}</strong> materiales en stock</p> )}
          </div>
        </Link>

        {/* 3. Sedes (Solo Admin) */}
        {userRole === 'ADMIN' && (
          <Link href="/sedes" className="bg-white p-8 rounded-3xl shadow-sm border border-teal-100 hover:shadow-lg hover:border-teal-300 transition-all group flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Sedes</h2>
            <p className="text-gray-500 mb-6 flex-grow">Administración de lugares fijos, altas, bajas y direcciones.</p>
            <div className="bg-teal-100/50 w-full py-3 rounded-xl">
              {loading ? ( <div className="flex justify-center"><div className="w-5 h-5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin"></div></div> ) : ( <p className="text-teal-700 font-medium"><strong className="text-lg">{stats.sedes}</strong> sedes activas</p> )}
            </div>
          </Link>
        )}

        {/* 4. Equipo (Solo Admin) */}
        {userRole === 'ADMIN' && (
          <Link href="/usuarios" className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-100 hover:shadow-lg hover:border-indigo-300 transition-all group flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Equipo</h2>
            <p className="text-gray-500 mb-6 flex-grow">Gestión de usuarios, altas, bajas y contraseñas de la plataforma.</p>
            <div className="bg-indigo-100/50 w-full py-3 rounded-xl">
              <p className="text-indigo-700 font-medium">Control de accesos 👥</p>
            </div>
          </Link>
        )}

        {/* 5. Planis */}
        <Link href="/planis" className="bg-white p-8 rounded-3xl shadow-sm border border-emerald-100 hover:shadow-lg hover:border-emerald-300 transition-all group flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Planis</h2>
          <p className="text-gray-500 mb-6 flex-grow">Armá y estructurá las rondas dejando notas de transición para la sesión.</p>
          <div className="bg-emerald-100/50 w-full py-3 rounded-xl">
            {loading ? ( <div className="flex justify-center"><div className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></div></div> ) : ( <p className="text-emerald-700 font-medium"><strong className="text-lg">{stats.planis}</strong> planis armadas</p> )}
          </div>
        </Link>

        {/* 6. Canciones */}
        <Link href="/catalogo" className="bg-white p-8 rounded-3xl shadow-sm border border-purple-100 hover:shadow-lg hover:border-purple-300 transition-all group flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Canciones</h2>
          <p className="text-gray-500 mb-6 flex-grow">Gestioná las canciones, subí audios, letras y ajustá las etiquetas y anotaciones.</p>
          <div className="bg-purple-100/50 w-full py-3 rounded-xl">
            {loading ? ( <div className="flex justify-center"><div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div></div> ) : ( <p className="text-purple-700 font-medium"><strong className="text-lg">{stats.canciones}</strong> canciones cargadas</p> )}
          </div>
        </Link>

      </div>
    </div>
  )
}