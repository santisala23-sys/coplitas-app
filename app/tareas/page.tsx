'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import TareaModal from '../components/TareaModal'

export default function TareasPage() {
  const [tareas, setTareas] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tareaEditando, setTareaEditando] = useState<any>(null) 

  const router = useRouter() 

  useEffect(() => {
    const role = Cookies.get('coplitas_role') || 'USER'
    const user = Cookies.get('coplitas_user') || ''
    setUserRole(role)
    setCurrentUser(user)
    
    fetchData(role, user)
  }, [])

  const fetchData = async (role: string, user: string) => {
    setLoading(true)
    
    // 1. Traemos TODOS los usuarios con su celular, no importa si es admin o no.
    const { data: dataUsuarios } = await supabase
        .from('usuarios')
        .select('id, username, celular') // ACÁ SUMAMOS CELULAR
        .eq('activo', true)
        .order('username')
    
    if (dataUsuarios) setUsuarios(dataUsuarios)

    // 2. Traemos las tareas de forma simple
    let query = supabase.from('tareas').select('*').order('completada', { ascending: true }).order('fecha_limite', { ascending: true, nullsFirst: false })
    
    if (role !== 'ADMIN') {
      query = query.eq('asignado_a', user)
    }

    const { data: dataTareas } = await query
    if (dataTareas) setTareas(dataTareas)

    setLoading(false)
  }

  // NUEVA FUNCIÓN: Enviar WhatsApp Corregida
  const enviarWhatsApp = (tarea: any) => {
    const usuarioAsignado = usuarios.find(u => u.username === tarea.asignado_a)
    const celular = usuarioAsignado?.celular

    if (!celular) {
      alert(`La persona asignada (${tarea.asignado_a}) no tiene un número de celular cargado en el sistema.`)
      return
    }

    const mensaje = encodeURIComponent(
      `¡Hola! Te escribo por una tarea de Coplitas:\n\n📌 *${tarea.descripcion}*\n📅 Fecha límite: ${formatearFecha(tarea.fecha_limite)}\n\n¡Gracias!`
    )
    
    window.open(`https://wa.me/${celular}?text=${mensaje}`, '_blank')
  }

  const toggleCompletada = async (tareaActual: any) => {
    const nuevoEstado = !tareaActual.completada
    
    setTareas(tareas.map(t => t.id === tareaActual.id ? { ...t, completada: nuevoEstado } : t))
    await supabase.from('tareas').update({ completada: nuevoEstado }).eq('id', tareaActual.id)

    if (nuevoEstado && tareaActual.materiales_ids && tareaActual.materiales_ids.length > 0) {
        try {
            await supabase.from('materiales')
                .update({ 
                    asignado_a: currentUser, 
                    sede_id: null 
                })
                .in('id', tareaActual.materiales_ids)
            
            alert(`¡Materiales transferidos automáticamente a tu nombre (${currentUser})!`)
        } catch(e) {
            console.error("Error al transferir materiales", e)
        }
    }
  }

  const handleEliminar = async (id: string) => {
    if (window.confirm('¿Seguro que querés borrar esta tarea?')) {
      await supabase.from('tareas').delete().eq('id', id)
      fetchData(userRole!, currentUser!)
    }
  }

  const handleEditar = (tarea: any) => {
    setTareaEditando(tarea)
    setIsModalOpen(true)
  }

  const handleNueva = () => {
    setTareaEditando(null)
    setIsModalOpen(true)
  }

  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return 'Sin apuro'
    const fecha = new Date(fechaStr)
    fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset()) 
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Mis Tareas</h1>
          <p className="text-gray-600">Pendientes y armado de materiales</p>
        </div>
        
        {userRole === 'ADMIN' && (
          <button 
            onClick={handleNueva} 
            className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto"
          >
            + Nueva Tarea
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando pendientes...</div>
      ) : (
        <div>
          {tareas.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
              <span className="text-4xl block mb-3">☕</span>
              <p className="text-gray-600 font-medium text-lg">Todo al día, no hay tareas pendientes.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {tareas.map((tarea) => {
                  const esTareaDeMaterial = tarea.descripcion.toLowerCase().includes('bolso') || tarea.descripcion.toLowerCase().includes('llevar')
                  return (
                <div 
                  key={tarea.id} 
                  className={`p-4 rounded-2xl border transition-all flex flex-col gap-4 ${
                    tarea.completada 
                      ? 'bg-gray-50 border-gray-200 opacity-60' 
                      : 'bg-white border-orange-100 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    
                    <button 
                        onClick={() => toggleCompletada(tarea)}
                        className="shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 group focus:outline-none"
                        style={{
                            borderColor: tarea.completada ? '#22c55e' : '#d1d5db',
                            backgroundColor: tarea.completada ? '#22c55e' : 'transparent',
                        }}
                        title={tarea.completada ? "Marcar como pendiente" : "Marcar como completada"}
                    >
                        <svg 
                            className={`w-5 h-5 text-white transition-opacity ${tarea.completada ? 'opacity-100' : 'opacity-0 group-hover:text-orange-400 group-hover:opacity-50'}`} 
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </button>

                    <div className="flex-grow">
                        <p className={`text-lg font-medium whitespace-pre-wrap ${tarea.completada ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                           {tarea.descripcion}
                        </p>
                        
                        <div className="flex flex-wrap gap-3 mt-2 text-xs font-semibold text-gray-500">
                        {userRole === 'ADMIN' && (
                            <span className="bg-gray-100 px-2 py-1 rounded-md capitalize flex items-center gap-1">
                            👤 Para: {tarea.asignado_a}
                            </span>
                        )}
                        
                        <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${tarea.fecha_limite && !tarea.completada ? 'bg-orange-50 text-orange-700' : 'bg-gray-100'}`}>
                            📅 {formatearFecha(tarea.fecha_limite)}
                        </span>

                        <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-md capitalize flex items-center gap-1">
                            ✍️ Asignó: {tarea.creado_por}
                        </span>
                        </div>
                    </div>

                    {userRole === 'ADMIN' && (
                        <div className="flex flex-col gap-2 shrink-0">
                        
                        {/* NUEVO BOTÓN WHATSAPP */}
                        {!tarea.completada && (
                          <button 
                            onClick={() => enviarWhatsApp(tarea)}
                            className="bg-green-50 text-green-600 hover:bg-green-600 hover:text-white p-2 rounded-lg transition text-xs font-bold flex items-center justify-center gap-1 border border-green-200"
                            title="Avisar por WhatsApp"
                          >
                            <span>💬</span> WhatsApp
                          </button>
                        )}

                        <button 
                            onClick={() => handleEditar(tarea)}
                            className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                        >
                            Editar
                        </button>
                        <button 
                            onClick={() => handleEliminar(tarea.id)}
                            className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                            title="Borrar tarea"
                        >
                            Borrar
                        </button>
                        </div>
                    )}
                  </div>
                   {esTareaDeMaterial && !tarea.completada && (
                      <div className="pl-12">
                        <button onClick={() => router.push('/inventario')} className="bg-blue-50 text-blue-700 font-bold px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition text-sm flex items-center gap-2">
                          <span>📦</span> Ir a transferir materiales al evento
                        </button>
                      </div>
                    )}
                </div>
              )})}
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <TareaModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => fetchData(userRole!, currentUser!)} 
          usuarios={usuarios}
          currentUser={currentUser}
          tareaEditando={tareaEditando} 
        />
      )}

    </div>
  )
}