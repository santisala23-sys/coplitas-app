'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PlaniModal from '../components/PlaniModal'
import Cookies from 'js-cookie' 

export default function PlanisPage() {
  const [planis, setPlanis] = useState<any[]>([])
  const [cancionesParaCatalogo, setCancionesParaCatalogo] = useState<any[]>([])
  // NUEVO: Estado para el inventario
  const [materialesInventario, setMaterialesInventario] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  const [isPlaniModalOpen, setIsPlaniModalOpen] = useState(false)
  const [planiEditando, setPlaniEditando] = useState<any>(null)

  useEffect(() => {
    setUserRole(Cookies.get('coplitas_role') || 'USER')
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // 1. Traer el catálogo de canciones
    const { data: dataCanciones } = await supabase
      .from('canciones')
      .select(`
        id, titulo,
        cancion_momento ( momentos ( nombre ) ),
        cancion_tematica ( tematicas ( nombre ) )
      `)
      .order('titulo')

    if (dataCanciones) setCancionesParaCatalogo(dataCanciones)

    // 2. NUEVO: Traer materiales para pasárselos al Modal
    const { data: dataMateriales } = await supabase
      .from('materiales')
      .select('id, nombre')
      .order('nombre')
      
    if (dataMateriales) setMaterialesInventario(dataMateriales)

    // 3. Traer las Planificaciones armadas (ahora leemos también la columna 'materiales')
    const { data: dataPlanis } = await supabase
      .from('planificaciones')
      .select(`
        id, titulo, descripcion, created_at, materiales,
        planificacion_cancion (
          orden,
          nota,
          cancion:canciones ( id, titulo, audio_url, letra_url )
        )
      `)
      .order('created_at', { ascending: false })

    if (dataPlanis) setPlanis(dataPlanis)

    setLoading(false)
  }

  // --- Funciones de Acción ---
  const handleNuevaPlani = () => {
    setPlaniEditando(null)
    setIsPlaniModalOpen(true)
  }

  const handleEditarPlani = (plani: any) => {
    setPlaniEditando(plani)
    setIsPlaniModalOpen(true)
  }

  const handleEliminarPlani = async (id: string, titulo: string) => {
    if (window.confirm(`¿Estás seguro que querés eliminar la plani "${titulo}"?`)) {
      await supabase.from('planificaciones').delete().eq('id', id)
      fetchData()
    }
  }

  // Helper para buscar el nombre de un material dado su ID
  const getNombreMaterial = (id: string) => {
    const mat = materialesInventario.find(m => m.id === id)
    return mat ? mat.nombre : 'Material Desconocido'
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      
      {/* CABECERA */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Mis Planis</h1>
          <p className="text-gray-600">Armado y estructura de las rondas</p>
        </div>
        
        {userRole === 'ADMIN' && (
          <button 
            onClick={handleNuevaPlani} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto"
          >
            + Armar Nueva Plani
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando tus planificaciones...</div>
      ) : (
        <div>
          {planis.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
              <p className="text-gray-500 text-lg">No hay planificaciones armadas todavía.</p>
              {userRole === 'ADMIN' && <p className="text-gray-400 text-sm mt-2">Creá tu primera plani para estructurar una ronda.</p>}
            </div>
          ) : (
            <div className="grid gap-6">
              {planis.map((plani) => {
                const cancionesDePlani = [...plani.planificacion_cancion].sort((a: any, b: any) => a.orden - b.orden);

                return (
                  <div key={plani.id} className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 relative group border-t-4 border-t-emerald-500">
                    
                    {userRole === 'ADMIN' && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => handleEditarPlani(plani)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-medium transition">
                          Editar
                        </button>
                        <button onClick={() => handleEliminarPlani(plani.id, plani.titulo)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition">
                          Borrar
                        </button>
                      </div>
                    )}

                    <h2 className={`text-2xl font-bold mb-1 text-gray-800 ${userRole === 'ADMIN' ? 'pr-32' : ''}`}>{plani.titulo}</h2>
                    {plani.descripcion && <p className="text-gray-600 mb-4">{plani.descripcion}</p>}

                    {/* NUEVO: ZONA DE MATERIALES REQUERIDOS */}
                    {plani.materiales && plani.materiales.length > 0 && (
                        <div className="mb-6 bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1"><span>📦</span> Materiales necesarios</h3>
                            <div className="flex flex-wrap gap-2">
                                {plani.materiales.map((matId: string, idx: number) => (
                                    <span key={idx} className="bg-white border border-amber-200 text-amber-900 text-xs px-2.5 py-1 rounded-md font-medium shadow-sm">
                                        {getNombreMaterial(matId)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Estructura de la sesión</h3>
                      <ul className="flex flex-col gap-3">
                        {cancionesDePlani.map((item: any, index: number) => (
                          <li key={index} className="flex flex-col bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center w-full">
                              <span className="font-medium text-gray-800 flex items-center">
                                <span className="bg-emerald-100 text-emerald-700 w-6 h-6 inline-flex justify-center items-center rounded-full text-xs font-bold mr-3 shrink-0">
                                  {item.orden}
                                </span>
                                {item.cancion?.titulo || <span className="text-red-500 italic">Canción eliminada del catálogo</span>}
                              </span>
                              
                              <div className="flex gap-2 shrink-0">
                                {item.cancion?.audio_url && (
                                  <audio src={item.cancion.audio_url} controls className="h-8 w-40" />
                                )}
                              </div>
                            </div>
                            
                            {item.nota && (
                              <div className="ml-9 mt-2 text-sm text-emerald-700 bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100/50 flex items-start">
                                <span className="mr-2 opacity-50">💬</span> 
                                <span className="italic">{item.nota}</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* RENDERIZADO DEL MODAL: Ahora le pasamos también el inventario */}
      <PlaniModal 
        isOpen={isPlaniModalOpen} 
        onClose={() => setIsPlaniModalOpen(false)} 
        planiAEditar={planiEditando} 
        onSave={fetchData} 
        catalogo={cancionesParaCatalogo} 
        inventario={materialesInventario} // <-- NUEVO PROP
      />

    </div>
  )
}