'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Cookies from 'js-cookie'

export default function InventarioPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'historial' | 'sedes'>('stock')
  
  const [materiales, setMateriales] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [sedes, setSedes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  // Estados para Modales
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false)
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false)
  const [isSedeModalOpen, setIsSedeModalOpen] = useState(false)
  
  const [materialSeleccionado, setMaterialSeleccionado] = useState<any>(null)
  const [sedeEditando, setSedeEditando] = useState<any>(null)

  // Formularios
  const [formMaterial, setFormMaterial] = useState({ nombre: '', cantidad_total: 1, descripcion: '', sede_id: '' })
  const [formMovimiento, setFormMovimiento] = useState({ cantidad: 1, origen: '', destino: '', notas: '' })
  const [formSede, setFormSede] = useState({ nombre: '', estado: 'ACTIVA' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const role = Cookies.get('coplitas_role') || 'USER'
    const user = Cookies.get('coplitas_user') || 'Usuario'
    setUserRole(role)
    setCurrentUser(user)
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // Traer Sedes
    const { data: dataSedes } = await supabase.from('sedes').select('*').order('nombre')
    if (dataSedes) setSedes(dataSedes)

    // Traer Materiales (incluyendo el nombre de la sede a la que pertenecen)
    const { data: dataMateriales } = await supabase
      .from('materiales')
      .select('*, sede:sedes(nombre)')
      .order('nombre')
    if (dataMateriales) setMateriales(dataMateriales)

    // Traer Historial
    const { data: dataMovimientos } = await supabase
      .from('movimientos_material')
      .select('*, material:materiales(nombre)')
      .order('fecha', { ascending: false })
      .limit(50)
    if (dataMovimientos) setMovimientos(dataMovimientos)

    setLoading(false)
  }

  // --- CRUD SEDES (Solo Admin) ---
  const handleSaveSede = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    if (sedeEditando) {
      await supabase.from('sedes').update({ nombre: formSede.nombre, estado: formSede.estado }).eq('id', sedeEditando.id)
    } else {
      await supabase.from('sedes').insert([{ nombre: formSede.nombre, estado: formSede.estado }])
    }
    setFormSede({ nombre: '', estado: 'ACTIVA' })
    setIsSedeModalOpen(false)
    setIsSaving(false)
    fetchData()
  }

  const handleEliminarSede = async (id: string, nombre: string) => {
    if (window.confirm(`¿Seguro que querés eliminar la sede "${nombre}"? Los materiales asociados quedarán sin sede.`)) {
      await supabase.from('sedes').delete().eq('id', id)
      fetchData()
    }
  }

  // --- CRUD MATERIALES ---
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const payload = {
      nombre: formMaterial.nombre,
      cantidad_total: formMaterial.cantidad_total,
      descripcion: formMaterial.descripcion,
      sede_id: formMaterial.sede_id || null
    }
    await supabase.from('materiales').insert([payload])
    setFormMaterial({ nombre: '', cantidad_total: 1, descripcion: '', sede_id: '' })
    setIsMaterialModalOpen(false)
    setIsSaving(false)
    fetchData()
  }

  // --- NUEVO MOVIMIENTO ---
  const handleSaveMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await supabase.from('movimientos_material').insert([{
      material_id: materialSeleccionado.id,
      usuario: currentUser,
      cantidad: formMovimiento.cantidad,
      origen: formMovimiento.origen,
      destino: formMovimiento.destino,
      notas: formMovimiento.notas
    }])
    setFormMovimiento({ cantidad: 1, origen: '', destino: '', notas: '' })
    setIsMovimientoModalOpen(false)
    setIsSaving(false)
    fetchData()
    setActiveTab('historial')
  }

  // Helpers
  const formatearFechaHora = (fechaStr: string) => {
    return new Date(fechaStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })
  }

  const sedesActivas = sedes.filter(s => s.estado === 'ACTIVA')

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      
      {/* CABECERA */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Inventario</h1>
          <p className="text-gray-600">Gestión de materiales y sedes</p>
        </div>
        
        {/* Botones de acción según la pestaña activa */}
        {userRole === 'ADMIN' && activeTab === 'stock' && (
          <button onClick={() => setIsMaterialModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto">+ Cargar Material</button>
        )}
        {userRole === 'ADMIN' && activeTab === 'sedes' && (
          <button onClick={() => { setSedeEditando(null); setFormSede({nombre: '', estado: 'ACTIVA'}); setIsSedeModalOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto">+ Nueva Sede</button>
        )}
      </div>

      {/* TABS NAVEGACIÓN */}
      <div className="flex gap-4 md:gap-8 mb-8 border-b-2 border-gray-200 overflow-x-auto whitespace-nowrap pb-1">
        <button className={`pb-3 text-lg font-bold px-2 ${activeTab === 'stock' ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setActiveTab('stock')}>Stock General</button>
        <button className={`pb-3 text-lg font-bold px-2 ${activeTab === 'historial' ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setActiveTab('historial')}>Historial</button>
        {/* Pestaña Sedes (Visible para todos, pero solo Admin edita) */}
        <button className={`pb-3 text-lg font-bold px-2 ${activeTab === 'sedes' ? 'text-teal-600 border-b-4 border-teal-600 -mb-0.5' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setActiveTab('sedes')}>Sedes</button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando datos...</div>
      ) : (
        <>
          {/* ========================================== */}
          {/* VISTA 1: STOCK DE MATERIALES               */}
          {/* ========================================== */}
          {activeTab === 'stock' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {materiales.map((mat) => (
                <div key={mat.id} className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-bold text-gray-800 pr-2">{mat.nombre}</h2>
                      <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg shrink-0">Total: {mat.cantidad_total}</span>
                    </div>
                    {/* Etiqueta de la Sede a la que pertenece */}
                    {mat.sede?.nombre ? (
                      <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold px-2 py-1 rounded mb-3">📍 {mat.sede.nombre}</span>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded mb-3">📍 Sin sede asignada</span>
                    )}
                    
                    {mat.descripcion && <p className="text-sm text-gray-500 mb-4">{mat.descripcion}</p>}
                  </div>
                  
                  <button onClick={() => { setMaterialSeleccionado(mat); setFormMovimiento({...formMovimiento, origen: mat.sede?.nombre || 'Depósito'}); setIsMovimientoModalOpen(true); }} className="mt-4 w-full bg-blue-50 text-blue-700 font-semibold py-2.5 rounded-xl border border-blue-200 hover:bg-blue-100 transition">
                    Mover Material 📦
                  </button>
                </div>
              ))}
              {materiales.length === 0 && <p className="text-gray-500 col-span-2 text-center py-10">No hay materiales cargados.</p>}
            </div>
          )}

          {/* ========================================== */}
          {/* VISTA 2: HISTORIAL DE MOVIMIENTOS          */}
          {/* ========================================== */}
          {activeTab === 'historial' && (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
              {movimientos.map((mov) => (
                <div key={mov.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-xl">📦</div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-800 capitalize">{mov.usuario}</span>
                      <time className="text-xs font-medium text-gray-400">{formatearFechaHora(mov.fecha)}</time>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Movió <strong className="text-blue-600">{mov.cantidad} {mov.material?.nombre}</strong></p>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 p-2 rounded-lg">
                      <span className="truncate w-1/2 text-right text-red-500">{mov.origen}</span>
                      <span>➡️</span>
                      <span className="truncate w-1/2 text-green-600">{mov.destino}</span>
                    </div>
                    {mov.notas && <p className="text-xs mt-2 text-gray-400 italic">" {mov.notas} "</p>}
                  </div>
                </div>
              ))}
              {movimientos.length === 0 && <p className="text-gray-500 text-center py-10">No hay movimientos registrados.</p>}
            </div>
          )}

          {/* ========================================== */}
          {/* VISTA 3: SEDES                             */}
          {/* ========================================== */}
          {activeTab === 'sedes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sedes.map((sede) => (
                <div key={sede.id} className="bg-white p-5 rounded-2xl shadow-sm border border-teal-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      {sede.nombre}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${sede.estado === 'ACTIVA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {sede.estado}
                      </span>
                    </h2>
                  </div>
                  
                  {userRole === 'ADMIN' && (
                    <div className="flex gap-2 shrink-0 ml-4">
                      <button onClick={() => { setSedeEditando(sede); setFormSede({nombre: sede.nombre, estado: sede.estado}); setIsSedeModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition">Editar</button>
                      <button onClick={() => handleEliminarSede(sede.id, sede.nombre)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">Borrar</button>
                    </div>
                  )}
                </div>
              ))}
              {sedes.length === 0 && <p className="text-gray-500 col-span-2 text-center py-10">No hay sedes cargadas.</p>}
            </div>
          )}
        </>
      )}

      {/* --- MODAL: SEDE (ADMIN) --- */}
      {isSedeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-teal-800">{sedeEditando ? 'Editar Sede' : 'Nueva Sede'}</h2><button onClick={() => setIsSedeModalOpen(false)} className="text-gray-400 font-bold text-xl p-2">✕</button></div>
            <form onSubmit={handleSaveSede} className="p-6 flex flex-col gap-4">
              <div><label className="text-sm font-semibold text-gray-700">Nombre de la Sede *</label><input required value={formSede.nombre} onChange={e => setFormSede({...formSede, nombre: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ej: Palermo" /></div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Estado *</label>
                <select value={formSede.estado} onChange={e => setFormSede({...formSede, estado: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="ACTIVA">Activa</option>
                  <option value="INACTIVA">Inactiva (Cerrada temporalmente)</option>
                </select>
              </div>
              <div className="mt-4 flex gap-3"><button type="button" onClick={() => setIsSedeModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100">Cancelar</button><button type="submit" disabled={isSaving || !formSede.nombre} className="w-2/3 py-3 rounded-xl font-bold bg-teal-600 text-white disabled:opacity-50">{isSaving ? 'Guardando...' : 'Guardar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: MATERIAL (ADMIN) --- */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-blue-900">Nuevo Material</h2><button onClick={() => setIsMaterialModalOpen(false)} className="text-gray-400 font-bold text-xl p-2">✕</button></div>
            <form onSubmit={handleSaveMaterial} className="p-6 flex flex-col gap-4">
              <div><label className="text-sm font-semibold text-gray-700">Nombre *</label><input required value={formMaterial.nombre} onChange={e => setFormMaterial({...formMaterial, nombre: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Pañuelos de Colores" /></div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-semibold text-gray-700">Cantidad *</label><input required type="number" min="1" value={formMaterial.cantidad_total} onChange={e => setFormMaterial({...formMaterial, cantidad_total: parseInt(e.target.value)})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Sede Base</label>
                  <select value={formMaterial.sede_id} onChange={e => setFormMaterial({...formMaterial, sede_id: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Sin Sede</option>
                    {sedesActivas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div><label className="text-sm font-semibold text-gray-700">Descripción / Detalles</label><input value={formMaterial.descripcion} onChange={e => setFormMaterial({...formMaterial, descripcion: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Están en la caja roja" /></div>
              <div className="mt-4 flex gap-3"><button type="button" onClick={() => setIsMaterialModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100">Cancelar</button><button type="submit" disabled={isSaving || !formMaterial.nombre} className="w-2/3 py-3 rounded-xl font-bold bg-blue-600 text-white disabled:opacity-50">{isSaving ? 'Guardando...' : 'Guardar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: REGISTRAR MOVIMIENTO --- */}
      {isMovimientoModalOpen && materialSeleccionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b bg-blue-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-blue-900">Mover {materialSeleccionado.nombre}</h2>
              <button onClick={() => setIsMovimientoModalOpen(false)} className="text-gray-500 font-bold text-xl p-2">✕</button>
            </div>
            <form onSubmit={handleSaveMovimiento} className="p-6 flex flex-col gap-4">
              <div><label className="text-sm font-semibold text-gray-700">¿Cuántos vas a mover? (Max: {materialSeleccionado.cantidad_total}) *</label><input required type="number" min="1" max={materialSeleccionado.cantidad_total} value={formMovimiento.cantidad} onChange={e => setFormMovimiento({...formMovimiento, cantidad: parseInt(e.target.value)})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 text-lg font-bold text-blue-700 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-semibold text-gray-700">Origen *</label><input required value={formMovimiento.origen} onChange={e => setFormMovimiento({...formMovimiento, origen: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 outline-none" placeholder="Ej: Depósito" /></div>
                <div><label className="text-sm font-semibold text-gray-700">Destino *</label><input required value={formMovimiento.destino} onChange={e => setFormMovimiento({...formMovimiento, destino: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 outline-none" placeholder="Ej: Sede Palermo o Cumple" /></div>
              </div>
              <div><label className="text-sm font-semibold text-gray-700">Aclaraciones (Opcional)</label><input value={formMovimiento.notas} onChange={e => setFormMovimiento({...formMovimiento, notas: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 outline-none" placeholder="Ej: Faltó uno que estaba roto" /></div>
              <div className="mt-4 flex gap-3"><button type="button" onClick={() => setIsMovimientoModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100">Cancelar</button><button type="submit" disabled={isSaving || !formMovimiento.origen || !formMovimiento.destino} className="w-2/3 py-3 rounded-xl font-bold bg-blue-600 text-white disabled:opacity-50">Registrar</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}