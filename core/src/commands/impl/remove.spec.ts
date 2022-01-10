import { createTestEvent, handle, hot } from '../../test/util'

test('should remove specified track', () => {
  const play = createTestEvent({ content: '/play test' })
  const remove = createTestEvent({ content: '/remove 0' })

  const messages = handle(hot('ab', { a: play, b: remove }))
  expect(messages).toMatchSnapshot()
})

test('should remove specified tracks', () => {
  const play = createTestEvent({ content: '/play test' })
  const play2 = createTestEvent({ content: '/play test2' })
  const play3 = createTestEvent({ content: '/play test3' })
  const remove = createTestEvent({ content: '/remove 0 1' })

  const messages = handle(hot('abcd', { a: play, b: play2, c: play3, d: remove }))
  expect(messages).toMatchSnapshot()
})

test('should throw if the user tries to remove track out of index', () => {
  const play = createTestEvent({ content: '/play test' })
  const remove = createTestEvent({ content: '/remove 1' })

  const messages = handle(hot('ab', { a: play, b: remove }))
  expect(messages).toMatchSnapshot()
})

test('should throw if the user tries to remove track with negative index', () => {
  const play = createTestEvent({ content: '/play test' })
  const remove = createTestEvent({ content: '/remove -1' })

  const messages = handle(hot('ab', { a: play, b: remove }))
  expect(messages).toMatchSnapshot()
})
