import { createTestEvent, handle, hot } from '../../test/util'

test('should skip the last added track', () => {
  const play = createTestEvent({ content: '/play test' })
  const play2 = createTestEvent({ content: '/play test2' })
  const removeLatest = createTestEvent({ content: '/removelatest' })

  const messages = handle(hot('abc', { a: play, b: play2, c: removeLatest }))
  expect(messages).toMatchSnapshot()
})

test('should skip the current playing track if that\'s the last one added', () => {
  const play = createTestEvent({ content: '/play test' })
  const removeLatest = createTestEvent({ content: '/removelatest' })

  const messages = handle(hot('ab', { a: play, b: removeLatest }))
  expect(messages).toMatchSnapshot()
})

test('should stop the player if the user has removed the last track and skipped the current one', () => {
  const play = createTestEvent({ content: '/play test' })
  const play2 = createTestEvent({ content: '/play test2' })
  const removeLatest = createTestEvent({ content: '/removelatest' })
  const skip = createTestEvent({ content: '/skip' })

  const messages = handle(hot('abcd', { a: play, b: play2, c: removeLatest, d: skip }))
  expect(messages).toMatchSnapshot()
})

test('should increment current track correctly when tracks are skipped', () => {
  const play = createTestEvent({ content: '/play test' })
  const play2 = createTestEvent({ content: '/play test2' })
  const removeLatest = createTestEvent({ content: '/removelatest' })
  const skip = createTestEvent({ content: '/skip' })
  const printQueue = createTestEvent({ content: '/queue' })

  const messages = handle(hot('abcdae', {
    a: play,
    b: play2,
    c: removeLatest,
    d: skip,
    e: printQueue,
  }))
  expect(messages).toMatchSnapshot()
})
