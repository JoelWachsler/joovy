import { createTestEvent, handle, hot } from '../../test/util'

test('should create player if not previously created', () => {
  const event = createTestEvent({ content: '/play test' })

  const messages = handle(hot('a', { a: event }))
  expect(messages).toMatchSnapshot()
})

test('should not create player if previously created', () => {
  const play = createTestEvent({ content: '/play test' })
  const playAgain = createTestEvent({ content: '/play test2' })

  const messages = handle(hot('ab', { a: play, b: playAgain }))
  expect(messages).toMatchSnapshot()
})
