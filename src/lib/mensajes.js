import { supabase } from './supabase'

const MSG_KEY = 'mensajes_sistema_v1'
const NOTIF_KEY = 'notifs_desconexion_v1'

export function listarMensajes() {
  try {
    return JSON.parse(localStorage.getItem(MSG_KEY) || '[]')
  } catch {
    return []
  }
}

function guardarMensajes(lista) {
  localStorage.setItem(MSG_KEY, JSON.stringify(lista))
  // Disparar evento para otras pestañas del mismo navegador
  try {
    window.dispatchEvent(new Event('mensajes-actualizados'))
  } catch (_) {}
}

export function enviarMensaje({ fromId, fromNombre, toId, toNombre, texto }) {
  if (!fromId || !toId || !texto?.trim()) {
    throw new Error('Mensaje incompleto')
  }
  const lista = listarMensajes()
  const msg = {
    id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    fromId: String(fromId),
    fromNombre: fromNombre || '',
    toId: String(toId),
    toNombre: toNombre || '',
    texto: texto.trim(),
    fecha: new Date().toISOString(),
    leido: false
  }
  lista.unshift(msg)
  guardarMensajes(lista)
  supabase.from('mensajes_app').upsert({
    id: msg.id,
    from_id: msg.fromId,
    from_nombre: msg.fromNombre,
    to_id: msg.toId,
    to_nombre: msg.toNombre,
    texto: msg.texto,
    fecha: msg.fecha,
    leido: false
  }).then(({ error }) => { if (error) console.warn(error.message) })
  return msg
}

export function mensajesRecibidos(userId) {
  const id = String(userId)
  return listarMensajes().filter(m => String(m.toId) === id)
}

export function noLeidos(userId) {
  return mensajesRecibidos(userId).filter(m => !m.leido).length
}

export function marcarLeidos(userId, fromId = null) {
  const id = String(userId)
  const from = fromId != null ? String(fromId) : null
  const lista = listarMensajes().map(m => {
    if (String(m.toId) === id && !m.leido && (!from || String(m.fromId) === from)) {
      return { ...m, leido: true }
    }
    return m
  })
  guardarMensajes(lista)
  lista.filter(m => String(m.toId) === id).forEach(m => {
    supabase.from('mensajes_app').update({ leido: true }).eq('id', m.id).then(() => {})
  })
}

export function conversacion(userId, otroId) {
  const a = String(userId)
  const b = String(otroId)
  return listarMensajes()
    .filter(m => {
      const f = String(m.fromId)
      const t = String(m.toId)
      return (f === a && t === b) || (f === b && t === a)
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
}

export function listarNotifsDesconexion() {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]')
  } catch {
    return []
  }
}

function guardarNotifs(lista) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(lista))
}

export function registrarNotifDesconexion(notif) {
  const lista = listarNotifsDesconexion()
  const clave = `${notif.userId}_${notif.fechaAlerta?.slice(0, 10)}_${notif.horas}`
  if (lista.some(n => n.clave === clave)) return null
  const item = {
    id: crypto.randomUUID?.() || String(Date.now()),
    clave,
    ...notif,
    leida: false,
    creadaEn: new Date().toISOString()
  }
  lista.unshift(item)
  guardarNotifs(lista.slice(0, 100))
  return item
}

export function marcarNotifLeida(id) {
  const lista = listarNotifsDesconexion().map(n =>
    n.id === id ? { ...n, leida: true } : n
  )
  guardarNotifs(lista)
}

export function noLeidasNotifs() {
  return listarNotifsDesconexion().filter(n => !n.leida).length
}

const TABLA_MSG = 'mensajes_app'
const TABLA_NOTIF = 'notifs_app'

export async function sincronizarMensajesNube() {
  try {
    const { data, error } = await supabase.from(TABLA_MSG).select('*').order('fecha', { ascending: false })
    if (error) throw error
    const lista = (data || []).map((r) => ({
      id: r.id,
      fromId: r.from_id,
      fromNombre: r.from_nombre,
      toId: r.to_id,
      toNombre: r.to_nombre,
      texto: r.texto,
      fecha: r.fecha,
      leido: !!r.leido
    }))
    localStorage.setItem(MSG_KEY, JSON.stringify(lista))
    window.dispatchEvent(new Event('mensajes-actualizados'))
    return lista
  } catch (e) {
    console.warn('mensajes nube:', e.message)
    return listarMensajes()
  }
}

async function upsertMensajeNube(msg) {
  try {
    await supabase.from(TABLA_MSG).upsert({
      id: msg.id,
      from_id: msg.fromId,
      from_nombre: msg.fromNombre,
      to_id: msg.toId,
      to_nombre: msg.toNombre,
      texto: msg.texto,
      fecha: msg.fecha,
      leido: !!msg.leido
    })
  } catch (e) {
    console.warn('upsert mensaje:', e.message)
  }
}

