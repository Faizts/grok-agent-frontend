import { test } from 'node:test'
import assert from 'node:assert/strict'
import { webSocketBase } from '../src/lib/connection.ts'

test('separate HTTPS deployment derives secure socket endpoint from API', () => {
  assert.equal(webSocketBase('https://api-agent.getvicinify.com/api/v1'), 'wss://api-agent.getvicinify.com/api/v1/ws')
  assert.equal(webSocketBase('https://api-agent.getvicinify.com/api/v1/', ''), 'wss://api-agent.getvicinify.com/api/v1/ws')
  assert.equal(webSocketBase('http://localhost:8080/api/v1'), 'ws://localhost:8080/api/v1/ws')
})

test('explicit socket proxy is respected and trailing slashes normalized', () => {
  assert.equal(webSocketBase('https://api.example.com/api/v1', 'wss://socket.example.com/api/v1/ws/'), 'wss://socket.example.com/api/v1/ws')
})

test('invalid socket schemes and credential/query URLs fail visibly', () => {
  for (const endpoint of ['https://api.example.com/ws', 'wss://user:secret@api.example.com/ws', 'wss://api.example.com/ws?token=secret', 'wss://api.example.com/ws#fragment']) {
    assert.throws(() => webSocketBase('https://api.example.com/api/v1', endpoint))
  }
})
