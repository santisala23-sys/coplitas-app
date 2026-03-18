'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Cookies from 'js-cookie'

export default function InventarioPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'historial'>('stock')
  
  const [materiales, setMateriales] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [sedes, setSedes] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false)
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false)
  const [isSedeModalOpen, setIsSedeModalOpen] = useState(false)
  const [materialSeleccionado, setMaterialSeleccionado] = useState<any>(null)
  const [materialEditando, setMaterialEditando] = useState<any>(null)

  const [formMaterial, setFormMaterial] = useState({ nombre: '', cantidad_total: 1, descripcion: '', sede_base_id: '' })
  const [formSede, setFormSede] = useState({ nombre: '', direccion: '', estado: 'ACTIVA' })
  const [formMovimiento, setFormMovimiento] = useState({ 
    cantidad: 1, 
    origen_tipo: 'SEDE', origen_id: '', 
    destino_tipo: 'USUARIO', destino_id: '', 
    notas: '' 
  })
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
    
    const [{ data: dataSedes }, { data: dataUsuarios }, { data: dataEventos }] = await Promise.all([
      supabase.from('sedes').select('*').eq('estado', 'ACTIVA').order('nombre'),
      supabase.from('usuarios').select('username').eq('activo', true).order('username'),
      supabase.from('eventos').select('id, titulo').eq('estado', 'PENDIENTE').order('fecha')
    ])
    if (dataSedes) setSedes(dataSedes)
    if (dataUsuarios) setUsuarios(dataUsuarios)
    if (dataEventos) setEventos(dataEventos)

    const { data: dataMateriales } = await supabase
      .from('materiales')
      .select('*, material_ubicacion(*, sede:sedes(nombre), evento:eventos(titulo))')
      .order('nombre')
    
    const materialesProcesados = dataMateriales?.map(mat => {
      const ubicacionesReales = mat.material_ubicacion?.filter((u: any) => u.cantidad > 0) || []
      const cantUbicada = ubicacionesReales.reduce((acc: number, u: any) => acc + u.cantidad, 0)
      const cantSinUbicar = mat.cantidad_total - cantUbicada
      return { ...mat, ubicaciones: ubicacionesReales, sin_ubicar: cantSinUbicar }
    }) || []
    
    setMateriales(materialesProcesados)

    const { data: dataMovimientos } = await supabase
      .from('movimientos_material')
      .select('*, material:materiales(nombre)')
      .order('fecha', { ascending: false })
      .limit(50)
    if (dataMovimientos) setMovimientos(dataMovimientos)

    setLoading(false)
  }

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    if (materialEditando) {
        const { error } = await supabase.from('materiales').update({
            nombre: formMaterial.nombre,
            cantidad_total: formMaterial.cantidad_total,
            descripcion: formMaterial.descripcion
        }).eq('id', materialEditando.id)

        if (!error && formMaterial.sede_base_id) {
             const { data: ubicacionesExistentes } = await supabase
                 .from('material_ubicacion')
                 .select('*')
                 .eq('material_id', materialEditando.id)
                 .eq('sede_id', formMaterial.sede_base_id)

             if (ubicacionesExistentes && ubicacionesExistentes.length > 0) {
                 // Update existing
                  await supabase.from('material_ubicacion').update({
                     cantidad: formMaterial.cantidad_total
                 }).eq('id', ubicacionesExistentes[0].id)
             } else {
                 // Insert new
                  await supabase.from('material_ubicacion').insert([{
                     material_id: materialEditando.id,
                     sede_id: formMaterial.sede_base_id,
                     cantidad: formMaterial.cantidad_total
                 }])
             }
        }
    } else {
        const { data: nuevoMat, error } = await supabase.from('materiales').insert([{
        nombre: formMaterial.nombre,
        cantidad_total: formMaterial.cantidad_total,
        descripcion: formMaterial.descripcion
        }]).select().single()

        if (!error && nuevoMat && formMaterial.sede_base_id) {
        await supabase.from('material_ubicacion').insert([{
            material_id: nuevoMat.id,
            sede_id: formMaterial.sede_base_id,
            cantidad: formMaterial.cantidad_total
        }])
        }
    }

    setFormMaterial({ nombre: '', cantidad_total: 1, descripcion: '', sede_base_id: '' })
    setIsMaterialModalOpen(false)
    setMaterialEditando(null)
    setIsSaving(false)
    fetchData()
  }

  const handleSaveSede = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    const { data: nuevaSede, error } = await supabase.from('sedes').insert([{
      nombre: formSede.nombre,
      direccion: formSede.direccion,
      estado: formSede.estado
    }]).select().single()

    if (!error && nuevaSede) {
        setFormMaterial(prev => ({...prev, sede_base_id: nuevaSede.id}))
    }

    setFormSede({ nombre: '', direccion: '', estado: 'ACTIVA' })
    setIsSedeModalOpen(false)
    setIsSaving(false)
    fetchData()
  }


  const handleSaveMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    const matId = materialSeleccionado.id
    const qty = formMovimiento.cantidad

    if (formMovimiento.origen_id !== 'SIN_UBICAR') {
      const colOrigen = formMovimiento.origen_tipo === 'SEDE' ? 'sede_id' : formMovimiento.origen_tipo === 'EVENTO' ? 'evento_id' : 'usuario_username'
      
      const { data: ubOrigen } = await supabase.from('material_ubicacion')
        .select('*').eq('material_id', matId).eq(colOrigen, formMovimiento.origen_id).single()
      
      if (ubOrigen) {
        await supabase.from('material_ubicacion').update({ cantidad: ubOrigen.cantidad - qty }).eq('id', ubOrigen.id)
      }
    }

    const colDestino = formMovimiento.destino_tipo === 'SEDE' ? 'sede_id' : formMovimiento.destino_tipo === 'EVENTO' ? 'evento_id' : 'usuario_username'
    const { data: ubDestino } = await supabase.from('material_ubicacion')
      .select('*').eq('material_id', matId).eq(colDestino, formMovimiento.destino_id).single()

    if (ubDestino) {
      await supabase.from('material_ubicacion').update({ cantidad: ubDestino.cantidad + qty }).eq('id', ubDestino.id)
    } else {
      const nuevoDestino = { material_id: matId, cantidad: qty } as any
      nuevoDestino[colDestino] = formMovimiento.destino_id
      await supabase.from('material_ubicacion').insert([nuevoDestino])
    }

    let nombreOrigen = formMovimiento.origen_id === 'SIN_UBICAR' ? 'Stock sin ubicar' : formMovimiento.origen_id
    if (formMovimiento.origen_tipo === 'SEDE' && formMovimiento.origen_id !== 'SIN_UBICAR') nombreOrigen = sedes.find(s => s.id === formMovimiento.origen_id)?.nombre || nombreOrigen
    if (formMovimiento.origen_tipo === 'EVENTO' && formMovimiento.origen_id !== 'SIN_UBICAR') nombreOrigen = eventos.find(e => e.id === formMovimiento.origen_id)?.titulo || nombreOrigen
    
    let nombreDestino = formMovimiento.destino_id
    if (formMovimiento.destino_tipo === 'SEDE') nombreDestino = sedes.find(s => s.id === formMovimiento.destino_id)?.nombre || nombreDestino
    if (formMovimiento.destino_tipo === 'EVENTO') nombreDestino = eventos.find(e => e.id === formMovimiento.destino_id)?.titulo || nombreDestino

    await supabase.from('movimientos_material').insert([{
      material_id: matId, usuario: currentUser, cantidad: qty,
      origen: nombreOrigen, destino: nombreDestino,
      origen_tipo: formMovimiento.origen_tipo, origen_id: formMovimiento.origen_id,
      destino_tipo: formMovimiento.destino_tipo, destino_id: formMovimiento.destino_id,
      notas: formMovimiento.notas
    }])

    setIsMovimientoModalOpen(false)
    setIsSaving(false)
    fetchData()
    setActiveTab('historial')
  }

  const handleEditarMaterial = (mat: any) => {
    setMaterialEditando(mat)
    setFormMaterial({
        nombre: mat.nombre,
        cantidad_total: mat.cantidad_total,
        descripcion: mat.descripcion || '',
        sede_base_id: '' 
    })
    setIsMaterialModalOpen(true)
  }

  const handleNuevoMaterial = () => {
    setMaterialEditando(null)
    setFormMaterial({ nombre: '', cantidad_total: 1, descripcion: '', sede_base_id: '' })
    setIsMaterialModalOpen(true)
  }

  const formatearFechaHora = (fechaStr: string) => new Date(fechaStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })

  const abrirModalMover = (mat: any) => {
    setMaterialSeleccionado(mat)
    let mejorOrigen = { tipo: 'SEDE', id: 'SIN_UBICAR', max: mat.sin_ubicar }
    
    mat.ubicaciones.forEach((u: any) => {
      if (u.cantidad > mejorOrigen.max) {
        mejorOrigen = { tipo: u.sede_id ? 'SEDE' : u.evento_id ? 'EVENTO' : 'USUARIO', id: u.sede_id || u.evento_id || u.usuario_username, max: u.cantidad }
      }
    })

    setFormMovimiento({ cantidad: 1, origen_tipo: mejorOrigen.tipo, origen_id: mejorOrigen.id, destino_tipo: 'USUARIO', destino_id: currentUser || '', notas: '' })
    setIsMovimientoModalOpen(true)
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Materiales</h1>
          <p className="text-gray-600">Control de stock e inventario dinámico</p>
        </div>
        
        {userRole === 'ADMIN' && activeTab === 'stock' && (
          <button onClick={handleNuevoMaterial} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto">+ Nuevo Material</button>
        )}
      </div>

      <div className="flex gap-4 md:gap-8 mb-8 border-b-2 border-gray-200 overflow-x-auto whitespace-nowrap pb-1">
        <button className={`pb-3 text-lg font-bold px-2 ${activeTab === 'stock' ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setActiveTab('stock')}>Estado del Stock</button>
        <button className={`pb-3 text-lg font-bold px-2 ${activeTab === 'historial' ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setActiveTab('historial')}>Últimos Movimientos</button>
      </div>

      {loading ? ( <div className="text-center py-10 text-gray-500">Cargando datos...</div> ) : (
        <>
          {activeTab === 'stock' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {materiales.map((mat) => (
                <div key={mat.id} className="bg-white p-5 rounded-3xl shadow-sm border border-blue-100 flex flex-col justify-between relative group">
                   {userRole === 'ADMIN' && (
                    <button 
                        onClick={() => handleEditarMaterial(mat)}
                        className="absolute top-4 right-4 text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition"
                        title="Editar Material"
                    >
                        ✏️
                    </button>
                   )}
                  <div>
                    <div className="flex justify-between items-start mb-4 pr-10">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 leading-tight">{mat.nombre}</h2>
                        {mat.descripcion && <p className="text-sm text-gray-500 mt-1">{mat.descripcion}</p>}
                      </div>
                      <div className="bg-blue-50 text-blue-700 font-black px-4 py-2 rounded-xl shrink-0 text-lg flex flex-col items-center border border-blue-100">
                        <span className="text-[10px] uppercase tracking-wider opacity-70 mb-[-4px]">Total</span>{mat.cantidad_total}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">¿Dónde están hoy?</h3>
                      <ul className="flex flex-col gap-2">
                        {mat.ubicaciones.map((ub: any) => (
                          <li key={ub.id} className="flex justify-between items-center text-sm font-medium">
                            <span className="flex items-center gap-2 text-gray-700">
                              {ub.sede_id && <span className="bg-teal-100 text-teal-700 p-1 rounded-md">📍</span>}
                              {ub.evento_id && <span className="bg-rose-100 text-rose-700 p-1 rounded-md">🎉</span>}
                              {ub.usuario_username && <span className="bg-purple-100 text-purple-700 p-1 rounded-md">👤</span>}
                              {ub.sede?.nombre || ub.evento?.titulo || <span className="capitalize">{ub.usuario_username}</span>}
                            </span>
                            <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 font-bold">{ub.cantidad}</span>
                          </li>
                        ))}
                        {mat.sin_ubicar > 0 && (
                          <li className="flex justify-between items-center text-sm font-medium opacity-60">
                            <span className="flex items-center gap-2 text-gray-500"><span className="bg-gray-200 p-1 rounded-md">❓</span> Sin ubicación</span>
                            <span className="bg-gray-200 px-3 py-1 rounded-lg font-bold">{mat.sin_ubicar}</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                  
                  <button onClick={() => abrirModalMover(mat)} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-2">
                    <span>📦</span> Mover Material
                  </button>
                </div>
              ))}
            </div>
          )}

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
                    <p className="text-sm text-gray-600 mb-3">Movió <strong className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{mov.cantidad}x {mov.material?.nombre}</strong></p>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <span className="truncate w-[45%] text-right text-gray-600 capitalize">{mov.origen_tipo === 'EVENTO' ? '🎉' : mov.origen_tipo === 'SEDE' ? '📍' : '👤'} {mov.origen}</span>
                      <span className="text-blue-400">➔</span>
                      <span className="truncate w-[45%] text-gray-800 font-bold capitalize">{mov.destino_tipo === 'EVENTO' ? '🎉' : mov.destino_tipo === 'SEDE' ? '📍' : '👤'} {mov.destino}</span>
                    </div>
                    {mov.notas && <p className="text-xs mt-2 text-gray-400 italic">" {mov.notas} "</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* --- MODALES --- */}

       {/* MODAL NUEVO/EDITAR MATERIAL */}
       {isMaterialModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-blue-900">{materialEditando ? 'Editar Material' : 'Nuevo Material'}</h2><button onClick={() => setIsMaterialModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-full font-bold text-xl w-10 h-10 flex justify-center items-center">✕</button></div>
            <form onSubmit={handleSaveMaterial} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div><label className="text-sm font-semibold text-gray-700">Nombre del recurso *</label><input required value={formMaterial.nombre} onChange={e => setFormMaterial({...formMaterial, nombre: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-semibold text-gray-700">Cantidad Total *</label><input required type="number" min="1" value={formMaterial.cantidad_total} onChange={e => setFormMaterial({...formMaterial, cantidad_total: parseInt(e.target.value)})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700">Sede Inicial</label>
                  <div className="flex gap-2">
                    <select value={formMaterial.sede_base_id} onChange={e => setFormMaterial({...formMaterial, sede_base_id: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">Sin ubicar (En tránsito)</option>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                    {!materialEditando && (
                        <button type="button" onClick={() => setIsSedeModalOpen(true)} className="mt-1 bg-teal-100 text-teal-700 p-3 rounded-xl border border-teal-200 hover:bg-teal-200 font-bold flex-shrink-0" title="Crear nueva sede">+</button>
                    )}
                  </div>
                </div>
              </div>
              <div><label className="text-sm font-semibold text-gray-700">Aclaraciones</label><input value={formMaterial.descripcion} onChange={e => setFormMaterial({...formMaterial, descripcion: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div className="mt-4 flex gap-3 pt-2 border-t"><button type="button" onClick={() => setIsMaterialModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">Cancelar</button><button type="submit" disabled={isSaving || !formMaterial.nombre} className="w-2/3 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOVER MATERIAL */}
      {isMovimientoModalOpen && materialSeleccionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b bg-blue-600 text-white flex justify-between items-center">
              <div><h2 className="text-xl font-bold">Transferir Material</h2><p className="text-blue-200 text-sm">{materialSeleccionado.nombre}</p></div>
              <button onClick={() => setIsMovimientoModalOpen(false)} className="text-white bg-blue-700 hover:bg-blue-800 rounded-full font-bold text-xl w-10 h-10 transition">✕</button>
            </div>
            
            <form onSubmit={handleSaveMovimiento} className="p-6 flex flex-col gap-5 overflow-y-auto">
              
              <div className="bg-blue-50 p-4 rounded-2xl flex items-center justify-between border border-blue-100">
                <label className="text-sm font-bold text-blue-900">¿Cuántos vas a mover?</label>
                <input required type="number" min="1" max={materialSeleccionado.cantidad_total} value={formMovimiento.cantidad} onChange={e => setFormMovimiento({...formMovimiento, cantidad: parseInt(e.target.value)})} className="w-20 p-2 text-center border-2 border-blue-200 rounded-xl bg-white text-xl font-black text-blue-700 outline-none focus:border-blue-500" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* ORIGEN */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 relative">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-xs font-bold text-gray-400">De</div>
                  <div className="ml-2">
                    <div className="flex gap-1 mb-2">
                      <button type="button" onClick={() => setFormMovimiento({...formMovimiento, origen_tipo: 'SEDE', origen_id: ''})} className={`flex-1 py-1 text-[11px] font-bold rounded-lg border ${formMovimiento.origen_tipo === 'SEDE' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>📍 Sede</button>
                      <button type="button" onClick={() => setFormMovimiento({...formMovimiento, origen_tipo: 'USUARIO', origen_id: ''})} className={`flex-1 py-1 text-[11px] font-bold rounded-lg border ${formMovimiento.origen_tipo === 'USUARIO' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>👤 Persona</button>
                      <button type="button" onClick={() => setFormMovimiento({...formMovimiento, origen_tipo: 'EVENTO', origen_id: ''})} className={`flex-1 py-1 text-[11px] font-bold rounded-lg border ${formMovimiento.origen_tipo === 'EVENTO' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300'}`}>🎉 Evento</button>
                    </div>
                    <select required value={formMovimiento.origen_id} onChange={e => setFormMovimiento({...formMovimiento, origen_id: e.target.value})} className="w-full p-2.5 border rounded-xl bg-white outline-none capitalize text-sm font-medium">
                      <option value="">-- Seleccionar --</option>
                      {formMovimiento.origen_tipo === 'SEDE' && (
                        <><option value="SIN_UBICAR">❓ Stock sin ubicar ({materialSeleccionado.sin_ubicar})</option>{sedes.map(s => { const cant = materialSeleccionado.ubicaciones.find((u:any) => u.sede_id === s.id)?.cantidad || 0; return <option key={s.id} value={s.id}>{s.nombre} ({cant})</option> })}</>
                      )}
                      {formMovimiento.origen_tipo === 'USUARIO' && usuarios.map(u => { const cant = materialSeleccionado.ubicaciones.find((ub:any) => ub.usuario_username === u.username)?.cantidad || 0; return <option key={u.username} value={u.username}>{u.username} ({cant})</option> })}
                      {formMovimiento.origen_tipo === 'EVENTO' && eventos.map(e => { const cant = materialSeleccionado.ubicaciones.find((ub:any) => ub.evento_id === e.id)?.cantidad || 0; return <option key={e.id} value={e.id}>{e.titulo} ({cant})</option> })}
                    </select>
                  </div>
                </div>

                {/* DESTINO */}
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 relative">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 border-2 border-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-white">A</div>
                  <div className="ml-2">
                    <div className="flex gap-1 mb-2">
                      <button type="button" onClick={() => setFormMovimiento({...formMovimiento, destino_tipo: 'SEDE', destino_id: ''})} className={`flex-1 py-1 text-[11px] font-bold rounded-lg border ${formMovimiento.destino_tipo === 'SEDE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>📍 Sede</button>
                      <button type="button" onClick={() => setFormMovimiento({...formMovimiento, destino_tipo: 'USUARIO', destino_id: ''})} className={`flex-1 py-1 text-[11px] font-bold rounded-lg border ${formMovimiento.destino_tipo === 'USUARIO' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>👤 Persona</button>
                      <button type="button" onClick={() => setFormMovimiento({...formMovimiento, destino_tipo: 'EVENTO', destino_id: ''})} className={`flex-1 py-1 text-[11px] font-bold rounded-lg border ${formMovimiento.destino_tipo === 'EVENTO' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>🎉 Evento</button>
                    </div>
                    <select required value={formMovimiento.destino_id} onChange={e => setFormMovimiento({...formMovimiento, destino_id: e.target.value})} className="w-full p-2.5 border rounded-xl bg-white outline-none capitalize text-sm font-medium border-blue-200 focus:ring-2 focus:ring-blue-500">
                      <option value="">-- Seleccionar --</option>
                      {formMovimiento.destino_tipo === 'SEDE' && sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      {formMovimiento.destino_tipo === 'USUARIO' && usuarios.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                      {formMovimiento.destino_tipo === 'EVENTO' && eventos.map(e => <option key={e.id} value={e.id}>{e.titulo}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div><input value={formMovimiento.notas} onChange={e => setFormMovimiento({...formMovimiento, notas: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 outline-none text-sm" placeholder="Nota opcional (Ej: Lo lleva Mica para el cumple)" /></div>
              
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => setIsMovimientoModalOpen(false)} className="w-1/3 py-3.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={isSaving || !formMovimiento.origen_id || !formMovimiento.destino_id} className="w-2/3 py-3.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-md">
                  {isSaving ? 'Moviendo...' : 'Confirmar Transferencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR SEDE (DESDE MATERIAL) */}
      {isSedeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-white"><h2 className="text-xl font-bold text-teal-800">Nueva Sede Rápida</h2><button onClick={() => setIsSedeModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-full font-bold text-xl p-2 transition w-10 h-10 flex items-center justify-center">✕</button></div>
            <form onSubmit={handleSaveSede} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div><label className="text-sm font-semibold text-gray-700">Nombre de la Sede *</label><input required value={formSede.nombre} onChange={e => setFormSede({...formSede, nombre: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ej: Colegio Las Marías" /></div>
              <div><label className="text-sm font-semibold text-gray-700">Dirección</label><input value={formSede.direccion} onChange={e => setFormSede({...formSede, direccion: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ej: Av. Cabildo 1234, CABA" /></div>
              <div className="mt-6 flex gap-3 pt-2 border-t"><button type="button" onClick={() => setIsSedeModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button><button type="submit" disabled={isSaving || !formSede.nombre} className="w-2/3 py-3 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition shadow-sm">{isSaving ? 'Guardando...' : 'Crear Sede'}</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}