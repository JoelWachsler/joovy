import { createTestEvent, e, handle, hot } from './test/util'

test('should ignore bot messages', () =>  {
  const event = createTestEvent({
    author: {
      username: 'testuser',
      bot: true,
      id: 'testAuthorId',
    },
    content: '/test',
  })

  const messages = handle(hot('a|', { a: event }))
  expect(messages).toMatchObject(e('a|', {
    a: {
      ignored: '/test was sent by a bot',
    },
  }))
})

test('should ignore messages starting with a slash', () => {
  const event = createTestEvent({
    content: 'test',
  })

  const messages = handle(hot('a|', { a: event }))
  expect(messages).toMatchObject(e('a|', {
    a: {
      ignored: 'test does not start with a slash',
    },
  }))
})
