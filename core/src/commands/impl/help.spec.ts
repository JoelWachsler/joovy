import { createTestEvent, handle, hot } from '../../test/util'

test('invalid command should call help', () => {
  const event = createTestEvent({ content: '/invalid command' })

  const messages = handle(hot('a|', { a: event }))
  expect(messages).toMatchSnapshot()
})