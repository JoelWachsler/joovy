import ArgParser from '../ArgParser'

test('should match command', () => {
  const test = ArgParser.create('test')
  const testing = ArgParser.create('testing')

  expect(test.is('/test')).toBe(true)
  expect(testing.is('/test')).toBe(false)
})
