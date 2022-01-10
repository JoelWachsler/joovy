import { createTestEvent, handle, hot } from '../../test/util'

test('should skip the current track if there are tracks in queue', () => {
  const play = createTestEvent({ content: '/play test' })
  const skip = createTestEvent({ content: '/skip' })

  const messages = handle(hot('ab', { a: play, b: skip }))
  expect(messages).toMatchSnapshot()
})

test('should not do anything if there are no tracks in queue', () => {
  const skip = createTestEvent({ content: '/skip' })

  const messages = handle(hot('a', { a: skip }))
  expect(messages).toMatchSnapshot()
})

test('should not do anything if we\'re there are no tracks left (skip twice with a single track)', () => {
  const play = createTestEvent({ content: '/play test' })
  const skip = createTestEvent({ content: '/skip' })

  const messages = handle(hot('abb', { a: play, b: skip }))
  expect(messages).toMatchSnapshot()
})
