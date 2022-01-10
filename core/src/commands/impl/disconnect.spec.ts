import { merge } from 'rxjs'
import { handleMessage } from '../../messageHandler'
import { createTestEvent, handle, hot, resultAndMessages } from '../../test/util'
import { disconnectFromChannel } from './Disconnect'

test('should emit disconnect event', () => {
  const disconnect = createTestEvent({ content: '/disconnect' })

  const messages = handle(hot('a', { a: disconnect }))
  expect(messages).toMatchSnapshot()
})

test('should disconnect, reconnect and disconnect again without any problem', () => {
  const play = createTestEvent({ content: '/play test' })
  const disconnect = createTestEvent({ content: '/disconnect' })

  const messages = handleMessage(hot(         'ab-a', { a: play, b: disconnect }))
  const messages2 = disconnectFromChannel(hot('--b-', { b: { event: disconnect, reason: 'test' } }))
  expect(resultAndMessages(merge(messages, messages2))).toMatchSnapshot()
})

test('should not crash if disconnecting when not connected', () => {
  const disconnect = createTestEvent({ content: '/disconnect' })

  const messages = resultAndMessages(disconnectFromChannel(hot('a', { a: { event: disconnect, reason: 'test' } })))
  expect(messages).toMatchSnapshot()
})
