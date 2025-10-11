export function base64url(input: ArrayBuffer | Uint8Array | string) {
  const enc = (buf: ArrayBuffer | Uint8Array) => {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    let str = ''
    for (let i = 0; i < b.length; i++) str += String.fromCharCode(b[i])
    return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
  }
  const dec = (b64url: string) => {
    const pad = '='.repeat((4 - (b64url.length % 4)) % 4)
    const b64 = (b64url + pad).replace(/-/g,'+').replace(/_/g,'/')
    const str = atob(b64)
    const out = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i)
    return out.buffer
  }
  if (typeof input === 'string') {
    return {
      encode: (s: string) => base64url(new TextEncoder().encode(s) as Uint8Array),
      decode: (s: string) => dec(s),
    }
  }
  return enc(input)
}

export function genWK(): Uint8Array {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return b
}

export async function deriveKEK(password: string, salt: Uint8Array, iterations: number) {
  const pwKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  )
}

export async function encryptRaw(key: CryptoKey, data: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return JSON.stringify({ v:1, iv: base64url(iv), ct: base64url(ct) })
}

export async function decryptRaw(key: CryptoKey, blob: string): Promise<Uint8Array> {
  const obj = JSON.parse(blob)
  const iv = new Uint8Array(base64url('').decode(obj.iv))
  const ct = base64url('').decode(obj.ct)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new Uint8Array(pt)
}

async function importAesGcmKey(raw: Uint8Array) {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt','decrypt'])
}

export async function encryptText(wk: Uint8Array, text: string) {
  const key = await importAesGcmKey(wk)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(text)
  const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, data)
  return JSON.stringify({ v:1, iv: base64url(iv), ct: base64url(ct) })
}

export async function decryptText(wk: Uint8Array, blob: string) {
  const key = await importAesGcmKey(wk)
  const obj = JSON.parse(blob)
  const iv = new Uint8Array(base64url('').decode(obj.iv))
  const ct = base64url('').decode(obj.ct)
  const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

export async function hmacWriteToken(wk: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', wk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('write'))
  return base64url(sig)
}

