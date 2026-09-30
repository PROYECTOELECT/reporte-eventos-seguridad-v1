import { supabase } from './supabase'

const KEY = 'novedades_personal_v1'

export const TIPOS_NOVEDAD = [
  { key: 'incapacidad', label: 'Incapacidad', color: '#dc2626' },
  { key: 'ausencia', label: 'Ausencia laboral', color: '#ea580c' },
  { key: 'informes', label: 'Informes', color: '#2563eb' },
  { key: 'recomendaciones', label: 'Recomendaciones', color: '#16a34a' },
  { key: 'calamidad', label: 'Calamidad', color: '#7c3aed' },
  { key: 'otros', label: 'Otros', color: '#6b7280' },
  { key: 'observaciones', label: 'Observaciones', color: '#0891b2' }
]

export function listarNovedadesPersonal() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function guardar(lista) {
  localStorage.setItem(KEY, JSON.stringify(lista))
}

function fechaHoyLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function crearNovedadPersonal(datos = {}) {
  const user = datos.user
  const tipo = datos.tipo
  const texto = datos.texto
  const archivos = datos.archivos || []
  const fechaReg = datos.fechaNovedad || datos.fecha || fechaHoyLocal()
  if (!user) throw new Error('Selecciona un usuario')
  if (!texto?.trim()) throw new Error('Escribe la observación')
  if (!fechaReg) throw new Error('Indica la fecha de la novedad')
  const item = {
    id: crypto.randomUUID?.() || String(Date.now()),
    userId: user.id,
    nombre: user.nombre,
    cedula: user.cedula,
    cargo: user.cargo || '',
    foto: user.foto || '',
    masterNombre: user.masterNombre || '',
    tipo,
    texto: texto.trim(),
    archivos,
    fecha: fechaReg,
    hora: new Date().toTimeString().slice(0, 5),
    autorId: datos.autorId || null,
    autorNombre: datos.autorNombre || '',
    creadoEn: new Date().toISOString()
  }
  const lista = listarNovedadesPersonal()
  lista.unshift(item)
  guardar(lista)
  subirNovedadNube(item)
  return item
}

export function eliminarNovedadPersonal(id) {
  guardar(listarNovedadesPersonal().filter((n) => n.id !== id))
}

export function filtrarNovedades({ userId, desde, hasta, masterId } = {}) {
  return listarNovedadesPersonal().filter((n) => {
    if (userId && String(n.userId) !== String(userId)) return false
    if (desde && n.fecha < desde) return false
    if (hasta && n.fecha > hasta) return false
    return true
  })
}

export function contarPorTipo(lista) {
  const base = {}
  TIPOS_NOVEDAD.forEach((t) => { base[t.key] = 0 })
  lista.forEach((n) => {
    if (base[n.tipo] != null) base[n.tipo]++
    else base.otros++
  })
  return base
}

const TABLA = 'novedades_personal'

export async function sincronizarNovedadesNube() {
  try {
    const { data, error } = await supabase.from(TABLA).select('*').order('creado_en', { ascending: false })
    if (error) throw error
    const actuales = listarNovedadesPersonal()
    const porId = new Map(actuales.map((n) => [String(n.id), n]))
    const lista = (data || []).map((r) => {
      const local = porId.get(String(r.id))
      return {
        id: r.id,
        userId: r.user_id,
        nombre: r.nombre,
        cedula: r.cedula,
        cargo: r.cargo || '',
        foto: local?.foto || '',
        masterNombre: r.master_nombre || '',
        tipo: r.tipo,
        texto: r.texto || '',
        archivos: local?.archivos || [],
        fecha: r.fecha,
        hora: r.hora || '',
        autorId: r.autor_id,
        autorNombre: r.autor_nombre || '',
        creadoEn: r.creado_en
      }
    })
    const idsNube = new Set(lista.map((n) => String(n.id)))
    actuales.forEach((n) => { if (!idsNube.has(String(n.id))) lista.push(n) })
    guardar(lista)
    return lista
  } catch (e) {
    console.warn('novedades nube:', e.message)
    return listarNovedadesPersonal()
  }
}

export function subirNovedadNube(item) {
  supabase.from(TABLA).upsert({
    id: item.id,
    user_id: item.userId,
    nombre: item.nombre,
    cedula: item.cedula,
    cargo: item.cargo,
    master_nombre: item.masterNombre,
    tipo: item.tipo,
    texto: item.texto,
    fecha: item.fecha,
    hora: item.hora,
    autor_id: item.autorId,
    autor_nombre: item.autorNombre,
    creado_en: item.creadoEn
  }).then(({ error }) => { if (error) console.warn(error.message) })
}
