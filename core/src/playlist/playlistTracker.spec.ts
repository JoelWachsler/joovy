import { map, merge, Observable } from 'rxjs'
import { disconnectFromChannel } from '../commands/impl/Disconnect'
import { handleMessage } from '../messageHandler'
import { createTestEvent, hot, sandbox } from '../test/util'
import { TRACKING_EVENT } from './PlaylistTracker'

test('should create tracker for playlist', () => {
  const play = createTestEvent({ content: '/play test' })

  const messages = sandbox.getMessages(handleTrackingMessages(hot('a', { a: play })))

  expect(messages).toMatchSnapshot()
})

test('should track multiple tracks in the same playlist', () => {
  const play = createTestEvent({ content: '/play test' })
  const play2 = createTestEvent({ content: '/play test2' })

  const messages = sandbox.getMessages(handleTrackingMessages(hot('ab', { a: play, b: play2 })))

  expect(messages).toMatchSnapshot()
})

test('should differentiate tracking between playlists', () => {
  const play = createTestEvent({ content: '/play test' })
  const disconnect = createTestEvent({ content: '/disconnect' })

  const messages = handleTrackingMessages(hot('a-a', { a: play }))
  const messages2 = disconnectFromChannel(hot('-b-', { b: { event: disconnect, reason: 'test' } })).pipe(
    map(msg => msg.result),
  )

  expect(sandbox.getMessages(merge(messages, messages2))).toMatchSnapshot()
})

const handleTrackingMessages = (source: Observable<any>) => handleMessage(source).pipe(
  map(msg => {
    // include the actual item when matching tracking events
    if (msg.result === TRACKING_EVENT) {
      return msg
    } else {
      return msg.result
    }
  }),
)
