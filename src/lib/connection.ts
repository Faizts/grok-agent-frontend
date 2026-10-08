// Prefer an explicit socket endpoint, otherwise derive it from the API address.
// Keeping both on the same deployment avoids a production localhost fallback.
export function webSocketBase(apiUrl: string, configuredUrl?: string): string {
  const explicit = configuredUrl?.trim()
  const url = new URL(explicit || apiUrl)
  const protocols = explicit ? ['ws:', 'wss:'] : ['http:', 'https:']
  if (!protocols.includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Invalid WebSocket configuration. Use a ws:// or wss:// endpoint without credentials or query parameters.')
  }
  if (!explicit) {
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/ws`
  }
  return url.toString().replace(/\/+$/, '')
}
