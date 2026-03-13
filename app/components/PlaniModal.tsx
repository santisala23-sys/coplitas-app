'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PlaniModal({ isOpen, onClose, planiAEditar, onSave, catalogo }: any) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cancionesSeleccionadas, setCancionesSeleccionadas] = useState<any[]>([])
  const [cancionIdAñadir, setCancionIdAñadir] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (planiAEditar) {
      setTitulo(planiAEditar.titulo || '')
      setDescripcion(planiAEditar.descripcion || '')
      
      // Ordenar las canciones según el campo 'orden' que viene de la base de datos
      if (planiAEditar.planificacion_cancion) {
        const cancionesOrdenadas = [...planiAEditar.planificacion_cancion]
          .sort((a: any, b: any) => a.orden - b.orden)
          .map((pc: any) => pc.cancion) // Nos quedamos solo con los datos de la canción
        setCancionesSeleccionadas(cancionesOrdenadas)
      } else {
        setCancionesSeleccionadas([])
      }
    } else {
      setTitulo('')
      setDescripcion('')
      setCancionesSeleccionadas([])
    }
    setCancionIdAñadir('')
  }, [planiAEditar, isOpen])

  if (!isOpen) return null

  // --- Funciones para manejar la lista de canciones de la Plani ---
  const agregarCancion = () => {
    if (!cancionIdAñadir) return
    const cancion = catalogo.find((c: any) => c.id === cancionIdAñadir)
    // Evitamos agregar la misma canción dos veces seguidas por error
    if (cancion && !cancionesSeleccionadas.find((c:any) => c.id === cancion.id)) {
      setCancionesSeleccionadas([...cancionesSeleccionadas, cancion])
    }
    setCancionIdAñadir('') // Reiniciar el selector
  }

  const quitarCancion = (index: number) => {
    const nuevas = [...cancionesSeleccionadas]
    nuevas.splice(index, 1)
    setCancionesSeleccionadas(nuevas)
  }

  const moverCancion = (index: number, direccion: 'up' | 'down') => {
    if (direccion === 'up' && index === 0) return
    if (direccion === 'down' && index === cancionesSeleccionadas.length - 1) return

    const nuevas = [...cancionesSeleccionadas]
    const temp = nuevas[index]
    const swapIndex = direccion === 'up' ? index - 1 : index + 1
    nuevas[index] = nuevas[swapIndex]
    nuevas[swapIndex] = temp
    setCancionesSeleccionadas(nuevas)
  }

  // --- Guardar en Supabase ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let planiId = planiAEditar?.id

      // 1. Guardar la Plani principal
      if (planiId) {
        await supabase.from('planificaciones').update({ titulo, descripcion }).eq('id', planiId)
      } else {
        const { data, error } = await supabase.from('planificaciones').insert([{ titulo, descripcion }]).select().single()
        if (error) throw error
        planiId = data.id
      }

      // 2. Limpiar las canciones viejas de esta plani
      await supabase.from('planificacion_cancion').delete().eq('planificacion_id', planiId)

      // 3. Insertar las canciones con su nuevo ORDEN
      if (cancionesSeleccionadas.length > 0) {
        const inserts = cancionesSeleccionadas.map((c, index) => ({
          planificacion_id: planiId,
          cancion_id: c.id,
          orden: index + 1 // El orden arranca en 1
        }))
        await supabase.from('planificacion_cancion').insert(inserts)
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error guardando plani:', error)
      alert('Hubo un error al guardar.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            {planiAEditar ? 'Editar Plani' : 'Armar Nueva Plani'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-xl">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Plani *</label>
            <input required type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} 
              className="w-full p-3 border rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              placeholder="Ej: Ronda de Primavera - Grupo 1" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción / Objetivos</label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} 
              className="w-full p-3 border rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              placeholder="Ej: Trabajar motricidad fina y reconocimiento de animales" 
            />
          </div>

          {/* Buscador para agregar canciones */}
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <label className="block text-sm font-semibold text-emerald-800 mb-2">Agregar Canciones a la Ronda</label>
            <div className="flex gap-2">
              <select 
                value={cancionIdAñadir} 
                onChange={(e) => setCancionIdAñadir(e.target.value)}
                className="w-full p-3 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Seleccionar canción del catálogo --</option>
                {catalogo.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.titulo}</option>
                ))}
              </select>
              <button 
                type="button" 
                onClick={agregarCancion}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 shrink-0"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Lista de canciones seleccionadas (Estructura de la ronda) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Estructura de la Ronda ({cancionesSeleccionadas.length})</label>
            {cancionesSeleccionadas.length === 0 ? (
              <p className="text-sm text-gray-500 italic p-4 text-center border rounded-lg bg-gray-50">No agregaste canciones todavía.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {cancionesSeleccionadas.map((cancion, index) => (
                  <li key={cancion.id} className="flex justify-between items-center bg-white border p-3 rounded-lg shadow-sm">
                    <span className="font-medium text-gray-800">
                      <span className="text-gray-400 mr-2">{index + 1}.</span> 
                      {cancion.titulo}
                    </span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moverCancion(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30">⬆️</button>
                      <button type="button" onClick={() => moverCancion(index, 'down')} disabled={index === cancionesSeleccionadas.length - 1} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30">⬇️</button>
                      <button type="button" onClick={() => quitarCancion(index)} className="p-1 text-red-400 hover:text-red-600 ml-2">❌</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              {isSaving ? 'Guardando...' : 'Guardar Plani'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}