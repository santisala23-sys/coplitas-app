'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TareaModal({ isOpen, onClose, onSave, usuarios, currentUser }: any) {
  const [descripcion, setDescripcion] = useState('')
  const [asignadoA, setAsignadoA] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const { error } = await supabase.from('tareas').insert([{ 
        descripcion, 
        asignado_a: asignadoA, 
        creado_por: currentUser,
        fecha_limite: fechaLimite || null // Si no ponen fecha, queda vacía
      }])

      if (error) throw error

      // Limpiamos el formulario y cerramos
      setDescripcion('')
      setAsignadoA('')
      setFechaLimite('')
      onSave()
      onClose()
    } catch (error) {
      console.error('Error guardando tarea:', error)
      alert('Hubo un error al guardar la tarea.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        
        <div className="p-5 border-b bg-white flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Asignar Nueva Tarea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 font-bold text-xl p-2 rounded-full hover:bg-gray-100 transition">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">¿Qué hay que hacer? *</label>
            <textarea 
              required 
              rows={3}
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)} 
              className="w-full p-3 border rounded-xl text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" 
              placeholder="Ej: Armar el bolso de materiales de la selva para el cumple del sábado..." 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">¿A quién le toca? *</label>
              <select 
                required
                value={asignadoA}
                onChange={(e) => setAsignadoA(e.target.value)}
                className="w-full p-3 border rounded-xl text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 capitalize"
              >
                <option value="">-- Elegir --</option>
                {usuarios.map((u: any) => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Límite</label>
              <input 
                type="date" 
                value={fechaLimite} 
                onChange={(e) => setFechaLimite(e.target.value)} 
                className="w-full p-3 border rounded-xl text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500" 
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition">Cancelar</button>
            <button type="submit" disabled={isSaving || !descripcion || !asignadoA} className="px-6 py-3 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition shadow-sm">
              {isSaving ? 'Guardando...' : 'Asignar Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}