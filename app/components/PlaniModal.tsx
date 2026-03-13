'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export default function PlaniModal({ isOpen, onClose, planiAEditar, onSave, catalogo }: any) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  // Ahora guardamos objetos con la canción y su nota: { cancion: {id, titulo...}, nota: '' }
  const [itemsRonda, setItemsRonda] = useState<any[]>([]) 
  
  const [searchTerm, setSearchTerm] = useState('') 
  const [selectedCancionId, setSelectedCancionId] = useState<string>('') 
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (planiAEditar) {
      setTitulo(planiAEditar.titulo || '')
      setDescripcion(planiAEditar.descripcion || '')
      if (planiAEditar.planificacion_cancion) {
        // Recuperamos la canción, la nota y ordenamos
        const ordenados = [...planiAEditar.planificacion_cancion]
          .sort((a: any, b: any) => a.orden - b.orden)
          .map((pc: any) => ({
            cancion: pc.cancion,
            nota: pc.nota || ''
          }))
        setItemsRonda(ordenados)
      } else {
        setItemsRonda([])
      }
    } else {
      setTitulo('')
      setDescripcion('')
      setItemsRonda([])
    }
    setSearchTerm('')
    setSelectedCancionId('')
  }, [planiAEditar, isOpen])

  const catalogoFiltrado = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return catalogo.filter((cancion: any) => {
      // Ocultar las que ya están en la plani
      if (itemsRonda.some(item => item.cancion.id === cancion.id)) return false
      if (!term) return true 

      if (cancion.titulo.toLowerCase().includes(term)) return true
      const momentos = cancion.cancion_momento?.map((cm: any) => cm.momentos.nombre.toLowerCase()) || []
      if (momentos.some((m: string) => m.includes(term))) return true
      const tematicas = cancion.cancion_tematica?.map((ct: any) => ct.tematicas.nombre.toLowerCase()) || []
      if (tematicas.some((t: string) => t.includes(term))) return true

      return false
    })
  }, [searchTerm, catalogo, itemsRonda])

  if (!isOpen) return null

  // --- Funciones para manejar la lista ---
  const agregarCancion = () => {
    const cancion = catalogo.find((c: any) => c.id === selectedCancionId)
    if (cancion) {
      // Agregamos el objeto con la nota vacía
      setItemsRonda([...itemsRonda, { cancion: cancion, nota: '' }])
      setSelectedCancionId('')
      setSearchTerm('')
    }
  }

  const quitarCancion = (index: number) => {
    const nuevas = [...itemsRonda]
    nuevas.splice(index, 1)
    setItemsRonda(nuevas)
  }

  const moverCancion = (index: number, direccion: 'up' | 'down') => {
    if (direccion === 'up' && index === 0) return
    if (direccion === 'down' && index === itemsRonda.length - 1) return

    const nuevas = [...itemsRonda]
    const temp = nuevas[index]
    const swapIndex = direccion === 'up' ? index - 1 : index + 1
    nuevas[index] = nuevas[swapIndex]
    nuevas[swapIndex] = temp
    setItemsRonda(nuevas)
  }

  // Nueva función para actualizar la nota de un ítem específico
  const actualizarNota = (index: number, nuevaNota: string) => {
    const nuevas = [...itemsRonda]
    nuevas[index].nota = nuevaNota
    setItemsRonda(nuevas)
  }

  // --- Guardar en Supabase ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let planiId = planiAEditar?.id

      if (planiId) {
        await supabase.from('planificaciones').update({ titulo, descripcion }).eq('id', planiId)
      } else {
        const { data, error } = await supabase.from('planificaciones').insert([{ titulo, descripcion }]).select().single()
        if (error) throw error
        planiId = data.id
      }

      await supabase.from('planificacion_cancion').delete().eq('planificacion_id', planiId)

      if (itemsRonda.length > 0) {
        const inserts = itemsRonda.map((item, index) => ({
          planificacion_id: planiId,
          cancion_id: item.cancion.id,
          orden: index + 1,
          nota: item.nota // Guardamos la nota específica
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        
        <div className="p-5 border-b bg-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-gray-800">
            {planiAEditar ? 'Editar Plani' : 'Armar Nueva Plani'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 font-bold text-xl p-2">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-6 flex flex-col gap-6 overflow-y-auto">
          
          <div className="grid gap-4">
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
          </div>

          {/* BUSCADOR */}
          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-inner flex flex-col gap-3">
            <label className="block text-sm font-semibold text-emerald-800">
              Buscar y Agregar Canciones a la Ronda
            </label>
            
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Filtrar por nombre, temática o momento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
              <button 
                type="button" 
                onClick={agregarCancion}
                disabled={!selectedCancionId}
                className="bg-emerald-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition"
              >
                Agregar
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg max-h-48 overflow-y-auto shadow-sm">
              {catalogoFiltrado.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {catalogoFiltrado.map((cancion: any) => (
                    <li key={cancion.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCancionId(cancion.id)}
                        className={`w-full text-left p-3 transition flex flex-col ${
                          selectedCancionId === cancion.id 
                            ? 'bg-emerald-100 border-l-4 border-emerald-500' 
                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        <span className={`block font-medium ${selectedCancionId === cancion.id ? 'text-emerald-900' : 'text-gray-800'}`}>
                          {cancion.titulo}
                        </span>
                        <span className="text-xs text-gray-500 truncate mt-1">
                          {cancion.cancion_tematica?.map((t:any) => t.tematicas.nombre).join(', ') || 'Sin temáticas'} 
                          {' • '} 
                          {cancion.cancion_momento?.map((m:any) => m.momentos.nombre).join(', ') || 'Sin momento'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-sm text-gray-500 text-center">
                  {searchTerm ? 'No hay resultados para tu búsqueda.' : 'No quedan canciones en el catálogo.'}
                </div>
              )}
            </div>
          </div>

          {/* LISTA DE CANCIONES Y NOTAS */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Estructura de la Ronda ({itemsRonda.length})
              </label>
            </div>
            
            {itemsRonda.length === 0 ? (
              <p className="text-sm text-gray-500 italic p-6 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                Aún no agregaste canciones.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {itemsRonda.map((item, index) => (
                  <li key={item.cancion.id} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex flex-col gap-2">
                    
                    {/* Fila 1: Título y Controles */}
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800 truncate pr-4 flex items-center">
                        <span className="bg-emerald-100 text-emerald-800 w-6 h-6 inline-flex justify-center items-center rounded-full text-xs font-bold mr-3 shrink-0">
                          {index + 1}
                        </span> 
                        {item.cancion.titulo}
                      </span>
                      <div className="flex gap-1 shrink-0 bg-gray-50 rounded-lg p-1 border">
                        <button type="button" onClick={() => moverCancion(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md disabled:opacity-30 transition">⬆️</button>
                        <button type="button" onClick={() => moverCancion(index, 'down')} disabled={index === itemsRonda.length - 1} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md disabled:opacity-30 transition">⬇️</button>
                        <div className="w-px bg-gray-200 mx-1"></div>
                        <button type="button" onClick={() => quitarCancion(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition">❌</button>
                      </div>
                    </div>

                    {/* Fila 2: Input para la Nota/Transición */}
                    <div className="ml-9 mr-1 text-sm bg-gray-50 border border-gray-100 rounded-lg overflow-hidden flex items-start">
                        <span className="text-gray-400 py-2 px-3 pl-2 select-none text-xs">💬</span>
                        <input 
                          type="text" 
                          placeholder='Ej: "Hoola, ¿cómo están?" / Materiales: 2 pañuelos'
                          value={item.nota}
                          onChange={(e) => actualizarNota(index, e.target.value)}
                          className="w-full bg-transparent p-2 pl-0 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-0 text-sm"
                        />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-3 border-t pt-6 shrink-0 bg-white">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition border">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm">
              {isSaving ? 'Guardando...' : 'Guardar Plani'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}