import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyEvent, finishMessages, fromHistory } from '../src/store/chat.ts'

test('assistant text survives multiple tool rounds and finishes', () => {
  let messages = []
  for (const event of [
    { type: 'text', content: 'Before' },
    { type: 'tool_call', tool: 'shell', input: { command: 'pwd' }, tool_call_id: 'a' },
    { type: 'tool_result', output: '/workspace', tool_call_id: 'a' },
    { type: 'text', content: 'After' },
    { type: 'text', content: ' tools' },
    { type: 'done' },
  ]) messages = applyEvent(messages, event)
  assert.deepEqual(messages.map(m => m.content), ['Before', '', 'After tools'])
  assert.equal(messages[1].toolOutput, '/workspace')
  assert.ok(messages.every(m => !m.streaming))
})
test('parallel tool results attach to their call IDs', () => {
  let messages = []
  for (const id of ['a', 'b']) messages = applyEvent(messages, { type: 'tool_call', tool: 'shell', tool_call_id: id })
  messages = applyEvent(messages, { type: 'tool_result', tool_call_id: 'a', output: 'first' })
  messages = applyEvent(messages, { type: 'tool_result', tool_call_id: 'b', output: '' })
  assert.deepEqual(messages.map(m => m.toolOutput), ['first', ''])
})
test('legacy history pairs results and preserves orphan outputs', () => {
  const messages = fromHistory([
    { id: '1', role: 'tool_call', tool_name: 'python', content: '{"code":"print(1)"}' },
    { id: '2', role: 'tool_result', tool_name: 'python', content: '1' },
    { id: '3', role: 'assistant', content: 'Done' },
    { id: '4', role: 'tool', tool_name: 'shell', content: 'orphan' },
  ])
  assert.deepEqual(messages[0].toolInput, { code: 'print(1)' })
  assert.equal(messages[0].toolOutput, '1')
  assert.equal(messages[2].role, 'tool_result')
})
test('error and interruption finalize streaming and discard empty placeholders', () => {
  const messages = [{ id: '1', role: 'assistant', content: 'partial', streaming: true }, { id: '2', role: 'assistant', content: '', streaming: true }]
  assert.deepEqual(applyEvent(messages, { type: 'error' }), finishMessages(messages))
  assert.equal(finishMessages(messages).length, 1)
  assert.equal(finishMessages(messages)[0].streaming, false)
})
test('saved user turn and assistant tool calls reconstruct after reload', () => {
  const messages = fromHistory([
    { id: 'user-1', role: 'user', content: 'Run pwd' },
    { id: 'assistant-1', role: 'assistant', content: 'Checking' },
    { id: 'assistant-1:call-1', role: 'tool_call', tool_name: 'shell', tool_call_id: 'call-1', tool_input: { command: 'pwd' } },
    { id: 'result-1', role: 'tool_result', tool_call_id: 'call-1', tool_name: 'shell', content: '/workspace' },
    { id: 'assistant-2', role: 'assistant', content: 'Done' },
  ])
  assert.deepEqual(messages.map(m => m.role), ['user', 'assistant', 'tool_call', 'assistant'])
  assert.equal(messages[2].toolOutput, '/workspace')
})
test('failed runs still show the saved user message after reload', () => {
  const messages = fromHistory([{ id: 'user-1', role: 'user', content: 'Try this' }])
  assert.deepEqual(messages.map(m => m.content), ['Try this'])
})
test('separate conversation arrays do not mutate one another', () => {
  const first = applyEvent([], { type: 'text', content: 'A' })
  const second = applyEvent([], { type: 'text', content: 'B' })
  applyEvent(first, { type: 'text', content: ' changed' })
  assert.equal(first[0].content, 'A')
  assert.equal(second[0].content, 'B')
})

test('response files stay attached to their turn when the next message arrives', () => {
  const file = { path: 'agents/bot/responses/turn-a/image.png', name: 'image.png', size: 42, modified: 1 }
  let messages = [{ id: 'temporary', role: 'user', content: 'Create an image' }]
  messages = applyEvent(messages, { type: 'turn_started', turn_id: 'turn-a' })
  messages = applyEvent(messages, { type: 'text', content: 'Here is your image' })
  messages = applyEvent(messages, { type: 'files', turn_id: 'turn-a', attachments: [file] })
  messages = applyEvent(messages, { type: 'done' })
  messages = [...messages, { id: 'turn-b', role: 'user', content: 'Next task' }]
  assert.deepEqual(messages[0].attachments, [file])
  assert.equal(messages.at(-1).attachments, undefined)
  const restored = fromHistory([{ id: 'turn-a', role: 'user', content: 'Create an image', attachments: [file] }])
  assert.deepEqual(restored[0].attachments, [file])
})
