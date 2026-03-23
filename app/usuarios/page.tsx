'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null)
  
  const [formUsuario, setFormUsuario] = useState({ 
    username: '', 
    password: '', 
    role: 'USER', 
    puesto: '', 
    celular: '', // NUEVO CAMPO
    activo: true 
  })
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const role = Cookies.get('coplitas_role')
    if (role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchUsuarios()
  }, [router])

  const fetchUsuarios = async () => {
    setLoading(true)
    const { data } = await supabase.from('usuarios').select('*').order('username')
    if (data) setUsuarios(data)
    setLoading(false)
  }

  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg('')
    
    // Limpiamos el celular de espacios, guiones o signos raros
    const celularLimpio = formUsuario.celular.replace(/[^0-9]/g, '')

    try {
      if (usuarioEditando) {
        const payload: any = { 
          role: formUsuario.role, 
          puesto: formUsuario.puesto, 
          celular: celularLimpio, // Guardamos el número limpio
          activo: formUsuario.activo 
        }
        if (formUsuario.password.trim() !== '') {
          payload.password = formUsuario.password
        }
        
        await supabase.from('usuarios').update(payload).eq('id', usuarioEditando.id)
      } else {
        if (formUsuario.password.trim() === '') {
          setErrorMsg('La contraseña es obligatoria para usuarios nuevos.')
          setIsSaving(false)
          return
        }
        const { data: existe } = await supabase.from('usuarios').select('id').eq('username', formUsuario.username.toLowerCase()).single()
        if (existe) {
          setErrorMsg('Ese nombre de usuario ya está en uso.')
          setIsSaving(false)
          return
        }

        await supabase.from('usuarios').insert([{
          username: formUsuario.username.toLowerCase(),
          password: formUsuario.password,
          role: formUsuario.role,
          puesto: formUsuario.puesto,
          celular: celularLimpio, // Guardamos el número limpio
          activo: formUsuario.activo
        }])
      }
      
      setFormUsuario({ username: '', password: '', role: 'USER', puesto: '', celular: '', activo: true })
      setIsModalOpen(false)
      fetchUsuarios()
    } catch (error) {
      console.error(error)
      setErrorMsg('Hubo un error al guardar.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      
      <div className="mb-6">
        <button onClick={() => router.push('/')} className="text-purple-600 font-semibold mb-2 flex items-center gap-1 hover:underline">
          ← Volver al Inicio
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
            <div>
            <h1 className="text-3xl font-bold mb-1 text-gray-800">Equipo</h1>
            <p className="text-gray-600">Gestión de usuarios y accesos</p>
            </div>
            
            <button 
            onClick={() => { 
                setUsuarioEditando(null); 
                setFormUsuario({username: '', password: '', role: 'USER', puesto: '', celular: '', activo: true}); 
                setErrorMsg('');
                setIsModalOpen(true); 
            }} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto"
            >
            + Agregar Persona
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando equipo...</div>
      ) : (
        <div className="grid gap-4">
          {usuarios.map((u) => (
            <div key={u.id} className={`p-5 rounded-2xl shadow-sm border flex items-center justify-between group ${u.activo ? 'bg-white border-purple-100' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-1 capitalize">
                  {u.username}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                  {!u.activo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-100 text-red-700">INACTIVO</span>
                  )}
                </h2>
                <div className="text-gray-500 text-sm flex gap-3 items-center">
                  <span>{u.puesto || 'Miembro del equipo'}</span>
                  {u.celular && (
                      <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-md">
                          📱 +{u.celular}
                      </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => { 
                    setUsuarioEditando(u); 
                    setFormUsuario({username: u.username, password: '', role: u.role, puesto: u.puesto || '', celular: u.celular || '', activo: u.activo}); 
                    setErrorMsg('');
                    setIsModalOpen(true); 
                  }} 
                  className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition font-medium"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: USUARIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-purple-800">{usuarioEditando ? 'Editar Persona' : 'Nueva Persona'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-full font-bold text-xl p-2 transition w-10 h-10 flex items-center justify-center">✕</button>
            </div>
            
            <form onSubmit={handleSaveUsuario} className="p-6 flex flex-col gap-4 overflow-y-auto">
              
              {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">{errorMsg}</div>}

              <div>
                <label className="text-sm font-semibold text-gray-700">Nombre de Usuario *</label>
                <input 
                  required 
                  disabled={!!usuarioEditando} 
                  value={formUsuario.username} 
                  onChange={e => setFormUsuario({...formUsuario, username: e.target.value})} 
                  className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 lowercase" 
                  placeholder="Ej: Mica" 
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Contraseña {usuarioEditando && <span className="font-normal text-gray-400">(Dejar vacío p/ no cambiar)</span>}
                </label>
                <input 
                  type="password"
                  value={formUsuario.password} 
                  onChange={e => setFormUsuario({...formUsuario, password: e.target.value})} 
                  className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-purple-500 outline-none" 
                  placeholder="******" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Puesto (Opcional)</label>
                    <input 
                      value={formUsuario.puesto} 
                      onChange={e => setFormUsuario({...formUsuario, puesto: e.target.value})} 
                      className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-purple-500 outline-none" 
                      placeholder="Ej: Copliter" 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Celular WhatsApp</label>
                    <input 
                      type="tel"
                      value={formUsuario.celular} 
                      onChange={e => setFormUsuario({...formUsuario, celular: e.target.value})} 
                      className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-purple-500 outline-none" 
                      placeholder="54911..." 
                    />
                  </div>
              </div>
              <p className="text-[10px] text-gray-400 -mt-2">El celular debe ir con código de país, sin el "+". Ej: 5491112345678</p>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nivel *</label>
                  <select 
                    value={formUsuario.role} 
                    onChange={e => setFormUsuario({...formUsuario, role: e.target.value})} 
                    className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  >
                    <option value="USER">Usuario (Tareas)</option>
                    <option value="ADMIN">Admin (Control)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Estado *</label>
                  <select 
                    value={formUsuario.activo ? 'true' : 'false'} 
                    onChange={e => setFormUsuario({...formUsuario, activo: e.target.value === 'true'})} 
                    className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" disabled={isSaving || !formUsuario.username} className="w-2/3 py-3 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition shadow-sm">
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