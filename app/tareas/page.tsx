'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Cookies from 'js-cookie'
import TareaModal from '../components/TareaModal'

export default function TareasPage() {
  const [tareas, setTareas] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const role = Cookies.get('coplitas_role') || 'USER'
    const user = Cookies.get('coplitas_user') || ''
    setUserRole(role)
    setCurrentUser(user)
    
    fetchData(role, user)
  }, [])

  const fetchData = async (role: string, user: string) => {
    setLoading(true)
    
    // Traemos los usuarios para el selector del Modal (solo activos)
    if (role === 'ADMIN') {
      const { data: dataUsuarios } = await supabase.from('usuarios').select('id, username').eq('activo', true).order('username')
      if (dataUsuarios) setUsuarios(dataUsuarios)
    }

    // Traemos las tareas (Si es ADMIN trae todas, si es USER trae solo las suyas)
    let query = supabase.from('tareas').select('*').order('completada', { ascending: true }).order('fecha_limite', { ascending: true, nullsFirst: false })
    
    if (role !== 'ADMIN') {
      query = query.eq('asignado_a', user)
    }

    const { data: dataTareas } = await query
    if (dataTareas) setTareas(dataTareas)

    setLoading(false)
  }

  // Marcar como completada o pendiente
  const toggleCompletada = async (id: string, estadoActual: boolean) => {
    // Actualizamos en la pantalla rápido para que no se note demora
    setTareas(tareas.map(t => t.id === id ? { ...t, completada: !estadoActual } : t))
    // Actualizamos en la base de datos
    await supabase.from('tareas').update({ completada: !estadoActual }).eq('id', id)
  }

  // Eliminar tarea (Solo admin)
  const handleEliminar = async (id: string) => {
    if (window.confirm('¿Seguro que querés borrar esta tarea?')) {
      await supabase.from('tareas').delete().eq('id', id)
      fetchData(userRole!, currentUser!)
    }
  }

  // Función para formatear la fecha
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return 'Sin apuro'
    const fecha = new Date(fechaStr)
    // Le sumamos un día porque los inputs de fecha a veces restan horas por la zona horaria
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
        
        {/* Solo el ADMIN puede crear tareas nuevas */}
        {userRole === 'ADMIN' && (
          <button 
            onClick={() => setIsModalOpen(true)} 
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
              {tareas.map((tarea) => (
                <div 
                  key={tarea.id} 
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                    tarea.completada 
                      ? 'bg-gray-50 border-gray-200 opacity-60' 
                      : 'bg-white border-orange-100 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Checkbox grande */}
                  <button 
                    onClick={() => toggleCompletada(tarea.id, tarea.completada)}
                    className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
                      tarea.completada 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 hover:border-orange-500'
                    }`}
                  >
                    {tarea.completada && <span>✓</span>}
                  </button>

                  <div className="flex-grow">
                    <p className={`text-lg font-medium ${tarea.completada ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {tarea.descripcion}
                    </p>
                    
                    <div className="flex flex-wrap gap-3 mt-2 text-xs font-semibold text-gray-500">
                      
                      {/* Mostrar a quién le toca (si sos admin está bueno ver para quién es la tarea) */}
                      {userRole === 'ADMIN' && (
                        <span className="bg-gray-100 px-2 py-1 rounded-md capitalize flex items-center gap-1">
                          👤 Para: {tarea.asignado_a}
                        </span>
                      )}
                      
                      {/* Fecha Límite */}
                      <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${tarea.fecha_limite && !tarea.completada ? 'bg-orange-50 text-orange-700' : 'bg-gray-100'}`}>
                        📅 {formatearFecha(tarea.fecha_limite)}
                      </span>

                      {/* Autor (quien la pidió) - AHORA SIEMPRE VISIBLE */}
                      <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-md capitalize flex items-center gap-1">
                        ✍️ Asignó: {tarea.creado_por}
                      </span>
                      
                    </div>
                  </div>

                  {/* Botón borrar (Solo ADMIN) */}
                  {userRole === 'ADMIN' && (
                    <button 
                      onClick={() => handleEliminar(tarea.id)}
                      className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                      title="Borrar tarea"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      <TareaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={() => fetchData(userRole!, currentUser!)} 
        usuarios={usuarios}
        currentUser={currentUser}
      />

    </div>
  )
}