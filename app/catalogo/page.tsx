'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SongModal from '../components/SongModal' // IMPORTANTE: Fijate que la ruta ahora usa ../
import Cookies from 'js-cookie' // <-- AGREGADO PARA LEER EL ROL

export default function CatalogoPage() {
  // Estados para Canciones
  const [canciones, setCanciones] = useState<any[]>([])
  const [filteredCanciones, setFilteredCanciones] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  
  // <-- AGREGADO: Estado para guardar si es ADMIN o USER
  const [userRole, setUserRole] = useState<string | null>(null) 

  // Estados para el Modal
  const [isSongModalOpen, setIsSongModalOpen] = useState(false)
  const [cancionEditando, setCancionEditando] = useState<any>(null)

  useEffect(() => {
    // Al cargar la página, leemos el rol del usuario que se logueó
    setUserRole(Cookies.get('coplitas_role') || 'USER')
    fetchCanciones()
  }, [])

  const fetchCanciones = async () => {
    setLoading(true)
    
    const { data: dataCanciones } = await supabase
      .from('canciones')
      .select(`
        id, titulo, audio_url, letra_url, anotaciones,
        cancion_momento ( momentos ( nombre ) ),
        cancion_tematica ( tematicas ( nombre ) )
      `)
      .order('titulo')

    if (dataCanciones) {
      setCanciones(dataCanciones)
      setFilteredCanciones(dataCanciones)
    }

    setLoading(false)
  }

  // Buscador de canciones
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCanciones(canciones)
      return
    }
    const term = searchTerm.toLowerCase()
    const filtradas = canciones.filter((c) => {
      if (c.titulo.toLowerCase().includes(term)) return true
      if (c.anotaciones && c.anotaciones.toLowerCase().includes(term)) return true
      if (c.cancion_momento.map((cm:any) => cm.momentos.nombre.toLowerCase()).some((m:string) => m.includes(term))) return true
      if (c.cancion_tematica.map((ct:any) => ct.tematicas.nombre.toLowerCase()).some((t:string) => t.includes(term))) return true
      return false
    })
    setFilteredCanciones(filtradas)
  }, [searchTerm, canciones])

  // --- Funciones de Eliminación ---
  const handleEliminarCancion = async (id: string, titulo: string) => {
    if (window.confirm(`¿Seguro que querés eliminar "${titulo}"?`)) {
      await supabase.from('canciones').delete().eq('id', id)
      fetchCanciones()
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      
      {/* CABECERA */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Catálogo de Canciones</h1>
          <p className="text-gray-600">Gestor de Canciones</p>
        </div>
        
        {/* <-- AGREGADO: Solo ADMIN ve el botón de Nueva Canción */}
        {userRole === 'ADMIN' && (
          <button 
            onClick={() => { setCancionEditando(null); setIsSongModalOpen(true); }} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto"
          >
            + Nueva Canción
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando datos...</div>
      ) : (
        <div>
          {/* BUSCADOR */}
          <div className="mb-8 sticky top-4 z-10">
            <input 
              type="text" 
              placeholder="Buscar canción, momento, palabra clave..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full p-4 text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg placeholder-gray-400 shadow-sm" 
            />
          </div>

          {/* LISTA DE CANCIONES */}
          <div className="grid gap-6">
            {filteredCanciones.map((cancion) => (
              <div key={cancion.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative group">
                
                {/* <-- AGREGADO: Solo ADMIN ve los botones Editar/Borrar */}
                {userRole === 'ADMIN' && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => { setCancionEditando(cancion); setIsSongModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition">Editar</button>
                    <button onClick={() => handleEliminarCancion(cancion.id, cancion.titulo)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition">Borrar</button>
                  </div>
                )}

                {/* Si no es admin le sacamos el padding a la derecha para que quede centrado */}
                <h2 className={`text-2xl font-semibold mb-3 text-gray-800 ${userRole === 'ADMIN' ? 'pr-32' : ''}`}>{cancion.titulo}</h2>
                
                <div className="flex flex-col gap-2 mb-4">
                  {cancion.cancion_momento?.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-sm items-center">
                      <strong className="text-gray-600 min-w-[80px]">Momentos:</strong>
                      {cancion.cancion_momento.map((cm: any, idx: number) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md">{cm.momentos.nombre}</span>
                      ))}
                    </div>
                  )}
                  {cancion.cancion_tematica?.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-sm items-center">
                      <strong className="text-gray-600 min-w-[80px]">Temáticas:</strong>
                      {cancion.cancion_tematica.map((ct: any, idx: number) => (
                        <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md">{ct.tematicas.nombre}</span>
                      ))}
                    </div>
                  )}
                </div>

                {cancion.anotaciones && (
                  <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg text-amber-900 text-sm whitespace-pre-wrap">
                    <strong>Anotación: </strong> {cancion.anotaciones}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
                  {cancion.audio_url ? <audio controls src={cancion.audio_url} className="w-full sm:w-2/3 h-10" /> : <p className="text-sm text-gray-400 italic">Audio no cargado</p>}
                  {cancion.letra_url && <a href={cancion.letra_url} target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition shadow-sm text-center w-full sm:w-auto">Ver Letra</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL */}
      <SongModal isOpen={isSongModalOpen} onClose={() => setIsSongModalOpen(false)} cancionAEditar={cancionEditando} onSave={fetchCanciones} />

    </div>
  )
}