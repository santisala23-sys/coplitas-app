'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function SedesPage() {
  const [sedes, setSedes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [isSedeModalOpen, setIsSedeModalOpen] = useState(false)
  const [sedeEditando, setSedeEditando] = useState<any>(null)
  
  // Agregamos la "direccion" al formulario
  const [formSede, setFormSede] = useState({ nombre: '', direccion: '', estado: 'ACTIVA' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const role = Cookies.get('coplitas_role')
    if (role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchSedes()
  }, [router])

  const fetchSedes = async () => {
    setLoading(true)
    // Nos traemos todo de la base de datos
    const { data } = await supabase.from('sedes').select('*').order('nombre')
    if (data) setSedes(data)
    setLoading(false)
  }

  const handleSaveSede = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    const payload = { 
      nombre: formSede.nombre, 
      direccion: formSede.direccion, 
      estado: formSede.estado 
    }

    if (sedeEditando) {
      await supabase.from('sedes').update(payload).eq('id', sedeEditando.id)
    } else {
      await supabase.from('sedes').insert([payload])
    }
    
    setFormSede({ nombre: '', direccion: '', estado: 'ACTIVA' })
    setIsSedeModalOpen(false)
    setIsSaving(false)
    fetchSedes()
  }

  const handleEliminarSede = async (id: string, nombre: string) => {
    if (window.confirm(`¿Seguro que querés eliminar "${nombre}"? Los materiales asociados quedarán sin sede.`)) {
      await supabase.from('sedes').delete().eq('id', id)
      fetchSedes()
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto min-h-screen">
      
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <button onClick={() => router.push('/')} className="text-teal-600 font-semibold mb-2 flex items-center gap-1 hover:underline">
            ← Volver al Inicio
          </button>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Sedes</h1>
          <p className="text-gray-600">Administración de lugares fijos</p>
        </div>
        
        <button 
          onClick={() => { setSedeEditando(null); setFormSede({nombre: '', direccion: '', estado: 'ACTIVA'}); setIsSedeModalOpen(true); }} 
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto"
        >
          + Nueva Sede
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando sedes...</div>
      ) : (
        <div className="grid gap-4">
          {sedes.map((sede) => (
            <div key={sede.id} className="bg-white p-5 rounded-2xl shadow-sm border border-teal-100 flex items-center justify-between group">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-1">
                  {sede.nombre}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${sede.estado === 'ACTIVA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {sede.estado || 'ACTIVA'} 
                  </span>
                </h2>
                
                {/* Mostramos la dirección si existe */}
                {sede.direccion ? (
                  <p className="text-gray-500 text-sm flex items-center gap-1">
                    <span>📍</span> {sede.direccion}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm italic">Sin dirección cargada</p>
                )}
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => { setSedeEditando(sede); setFormSede({nombre: sede.nombre, direccion: sede.direccion || '', estado: sede.estado || 'ACTIVA'}); setIsSedeModalOpen(true); }} 
                  className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition font-medium"
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleEliminarSede(sede.id, sede.nombre)} 
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition font-medium"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
          {sedes.length === 0 && <p className="text-gray-500 text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">Aún no cargaste ninguna sede.</p>}
        </div>
      )}

      {/* MODAL: SEDE */}
      {isSedeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-teal-800">{sedeEditando ? 'Editar Sede' : 'Nueva Sede'}</h2>
              <button onClick={() => setIsSedeModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-full font-bold text-xl p-2 transition w-10 h-10 flex items-center justify-center">✕</button>
            </div>
            
            <form onSubmit={handleSaveSede} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="text-sm font-semibold text-gray-700">Nombre de la Sede *</label>
                <input 
                  required 
                  value={formSede.nombre} 
                  onChange={e => setFormSede({...formSede, nombre: e.target.value})} 
                  className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none" 
                  placeholder="Ej: Colegio Las Marías" 
                />
              </div>

              {/* AGREGAMOS EL CAMPO DIRECCIÓN */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Dirección</label>
                <input 
                  value={formSede.direccion} 
                  onChange={e => setFormSede({...formSede, direccion: e.target.value})} 
                  className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none" 
                  placeholder="Ej: Av. Cabildo 1234, CABA" 
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Estado *</label>
                <select 
                  value={formSede.estado} 
                  onChange={e => setFormSede({...formSede, estado: e.target.value})} 
                  className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="ACTIVA">Activa</option>
                  <option value="INACTIVA">Inactiva (Cerrada temporalmente)</option>
                </select>
              </div>

              <div className="mt-6 flex gap-3 pt-2 border-t">
                <button type="button" onClick={() => setIsSedeModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" disabled={isSaving || !formSede.nombre} className="w-2/3 py-3 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition shadow-sm">
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}