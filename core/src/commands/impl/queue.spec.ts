import Track from '../../player/Track'
import { playlistConfig } from '../../playlist/Playlist'
import { createTestEvent, handle, hot } from '../../test/util'
import { createReactions, FormatQueueArgs, QueueReactions } from './Queue'

test('should queue song if another one is already playing', () => {
  const play = createTestEvent({ content: '/play test' })
  const playAgain = createTestEvent({ content: '/play test2' })
  const playAgainAgain = createTestEvent({ content: '/play test3' })

  const messages = handle(hot('abc', { a: play, b: playAgain, c: playAgainAgain }))
  expect(messages).toMatchSnapshot()
})

test('should print queue with no tracks', () => {
  const queue = createTestEvent({ content: '/queue' })

  const messages = handle(hot('a', { a: queue }))
  expect(messages).toMatchSnapshot()
})

test('should print queue', () => {
  const play = createTestEvent({ content: '/play test' })
  const queue = createTestEvent({ content: '/queue' })

  const messages = handle(hot('ab', { a: play, b: queue }))
  expect(messages).toMatchSnapshot()
})

test('should print queue with multiple tracks', () => {
  const play = createTestEvent({ content: '/play test' })
  const playAnotherTrack = createTestEvent({ content: '/play test2' })
  const queue = createTestEvent({ content: '/queue' })

  const messages = handle(hot('abc', { a: play, b: playAnotherTrack, c: queue }))
  expect(messages).toMatchSnapshot()
})

test('should mark the current track the user is listening to', () => {
  const play = createTestEvent({ content: '/play test' })
  const playAnotherTrack = createTestEvent({ content: '/play test2' })
  const queue = createTestEvent({ content: '/queue' })

  // each track is 5 frames long, move to the frame after next track has started
  // i.e. frame 6 (ab = 2 frames + 4 frames = 6)
  const messages = handle(hot('ab----c', { a: play, b: playAnotherTrack, c: queue }))
  expect(messages).toMatchSnapshot()
})

test('should disconnect after the player has been idle for a certain amount of frames', () => {
  const play1 = createTestEvent({ content: '/play test1' })
  const play2 = createTestEvent({ content: '/play test2' })
  playlistConfig.timeoutFrames = 3

  // A song is 5 frame long, added on frame 0 -> frame 5 should result in the player being idle.
  // At frame 13 the player should disconnect.
  const messages = handle(hot('ab', { a: play1, b: play2 }))
  expect(messages).toMatchSnapshot()
})

test('should be able to reconnect after idle timeout', () => {
  const play = createTestEvent({ content: '/play test' })
  const skip = createTestEvent({ content: '/skip' })
  playlistConfig.timeoutFrames = 3

  const messages = handle(hot('ab----c', { a: play, b: skip, c: play }))
  expect(messages).toMatchSnapshot()
})

test('should add reactions to playlist longer than a single page', () => {
  const play1 = createTestEvent({ content: '/play test1' })
  const play2 = createTestEvent({ content: '/play test2' })
  const play3 = createTestEvent({ content: '/play test3' })
  const play4 = createTestEvent({ content: '/play test4' })
  const play5 = createTestEvent({ content: '/play test5' })
  const play6 = createTestEvent({ content: '/play test6' })
  const queue = createTestEvent({ content: '/queue' })

  const messages = handle(hot('abcdefg', {
    a: play1,
    b: play2,
    c: play3,
    d: play4,
    e: play5,
    f: play6,
    g: queue,
  }))
  expect(messages).toMatchSnapshot()
})

describe('reactions', () => {
  const createTrack = (input?: Partial<Track>): Track => {
    return {
      link: 'testLink',
      name: 'testName',
      removed: false,
      author: {
        id: 'authorId',
        username: 'testusername',
      },
      ...input,
    }
  }

  describe('with less than a single page', () => {
    it('should not print any reactions', () => {
      const args = new FormatQueueArgs([createTrack()], 0)
      const reactions = createReactions(args)

      expect(reactions).toEqual([])
    })
  })

  describe('with more than a single page', () => {
    // A single page has a size of 5, to get reactions we need more
    // than a single page, i.e. 6 tracks.
    const queue = Array(6).fill(createTrack())

    it('should react with next when on first page', () => {
      const reactions = createReactions(new FormatQueueArgs(queue, 0))
      expect(reactions).toEqual([QueueReactions.NEXT])
    })

    it('should react with previous when on seconds page', () => {
      const reactions = createReactions(new FormatQueueArgs(queue, 0).nextPage)
      expect(reactions).toEqual([QueueReactions.BACK])
    })
  })

  describe('with three pages', () => {
    // Three pages = 5 * 3 = 15
    const queue = Array(15).fill(createTrack())

    it('should react with next and two next when on first page', () => {
      const reactions = createReactions(new FormatQueueArgs(queue, 0))
      expect(reactions).toEqual([QueueReactions.NEXT, QueueReactions.TWO_NEXT])
    })

    it('should react with previous and next on second page', () => {
      const reactions = createReactions(new FormatQueueArgs(queue, 0).nextPage)
      expect(reactions).toEqual([QueueReactions.BACK, QueueReactions.NEXT])
    })

    it('should react with two previous and previous on third page', () => {
      const reactions = createReactions(new FormatQueueArgs(queue, 0).nextPage.nextPage)
      expect(reactions).toEqual([QueueReactions.TWO_BACK, QueueReactions.BACK])
    })
  })
})