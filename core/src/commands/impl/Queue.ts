import { MessageEmbed } from 'discord.js'
import { catchError, concat, concatMap, defaultIfEmpty, map, mergeMap, mergeMapTo, Observable, of } from 'rxjs'
import JEvent from '../../jevent/JEvent'
import { Result } from '../../jevent/Result'
import JMessage, { JReaction } from '../../JMessage'
import Track from '../../player/Track'
import { getPlaylist } from '../../playlist/Playlist'
import ArgParser from '../ArgParser'
import Command from '../command'

export default class Queue implements Command {
  argument = ArgParser.create('queue')
  helpText = 'Print the current queue.'

  handleMessage(event: JEvent): Observable<Result> {
    return getPlaylist(event).pipe(
      map(playlist => playlist.currentQueue),
      defaultIfEmpty({
        currentTrack: -1,
        queue: [],
      }),
      mergeMap(({ queue, currentTrack }) => printQueue(event, new FormatQueueArgs(queue, currentTrack))),
    )
  }
}

const createQueueContent = (event: JEvent, args: FormatQueueArgs, reactions: JReaction[]) => {
  const {
    currentTrack,
    queue,
    end,
    start,
  } = args

  if (queue.length === 0) {
    return new MessageEmbed()
      .setTitle('The queue is empty 👀')
  }

  const printedQueue: string[] = []
  let j = 0
  for (let i = start; i <= end; i++) {
    const track = queue[i]
    if (track) {
      if (track.removed) {
        printedQueue[j++] = `\`${i})\` ~~${track.name}~~`
      } else if (i == currentTrack) {
        printedQueue[j++] = '⬐ current track'
        printedQueue[j++] = `\`${i})\` ${track.name}`
        printedQueue[j++] = '⬑ current track'
      } else {
        printedQueue[j++] = `\`${i})\` ${track.name}`
      }
    }
  }

  const embed = new MessageEmbed()
    .setColor('#ffb81f')
    .setTitle('Queue')
    .setDescription(printedQueue.join('\n'))
    .setTimestamp(event.timestamp)

  if (reactions.length > 0) {
    embed.setDescription(`${embed.description}\n\n**${args.nrTracksLeftStr} more track(s) in queue.**`)
  }

  return embed
}

const editQueue = (event: JEvent, args: FormatQueueArgs, message: JMessage): Observable<Result> => {
  const reactions = createReactions(args)
  return message.edit({ embeds: [createQueueContent(event, args, reactions)] }).pipe(
    concatMap(msg => msg.clearReactions),
    mergeMap(newMsg => {
      return concat(
        addReactions({ event, message, allReactions: reactions, reactions }),
        event.result({ result: { messageEdited: true } }),
        editOnReaction(event, args, newMsg),
      )
    }),
  )
}

const editOnReaction = (event: JEvent, args: FormatQueueArgs, message: JMessage) => {
  return message.reactions.pipe(
    mergeMap(reaction => {
      if (reaction === QueueReactions.NEXT) {
        return editQueue(event, args.nextPage, message)
      } else if (reaction === QueueReactions.BACK) {
        return editQueue(event, args.previousPage, message)
      } else if (reaction === QueueReactions.TWO_NEXT) {
        return editQueue(event, args.nextPage.nextPage, message)
      } else if (reaction === QueueReactions.TWO_BACK) {
        return editQueue(event, args.previousPage.previousPage, message)
      } else {
        return of()
      }
    }),
    catchError(err => {
      if (err instanceof Map) {
        // this is probably a timeout error -> ignore it
        return message.clearReactions.pipe(
          mergeMapTo(event.result({ reactions: 'cleared' })),
        )
      }

      throw err
    }),
  )
}

interface AddReactionsArgs {
  event: JEvent
  message: JMessage
  allReactions: JReaction[]
  reactions: JReaction[]
}

const addReactions = (args: AddReactionsArgs): Observable<Result> => {
  const { reactions, event, allReactions, message } = args

  if (allReactions.length === 0) {
    return of()
  }

  if (reactions.length === 0) {
    return event.result({ addedReactions: allReactions })
  }

  const [reaction, ...rest] = reactions
  return message.react(reaction).pipe(
    concatMap(newMsg => addReactions({ ...args, message: newMsg, reactions: rest })),
  )
}

const printQueue = (event: JEvent, args: FormatQueueArgs): Observable<Result> => {
  const reactionsToAdd = createReactions(args)
  return event.sendMessage(createQueueContent(event, args, reactionsToAdd)).pipe(
    mergeMap(result => {
      const message = result.item
      return concat(
        of(result),
        addReactions({ event, message, allReactions: reactionsToAdd, reactions: reactionsToAdd }),
        editOnReaction(event, args, message),
      )
    }),
  )
}

export const createReactions = (args: FormatQueueArgs) => {
  const reactions: string[] = []

  if (args.hasMoreThanTwoPagesPrevious) {
    reactions.push(QueueReactions.TWO_BACK)
  }

  if (args.hasPreviousPages) {
    reactions.push(QueueReactions.BACK)
  }

  if (args.hasMorePages) {
    reactions.push(QueueReactions.NEXT)
  }

  if (args.hasMoreThanTwoPagesLeft) {
    reactions.push(QueueReactions.TWO_NEXT)
  }

  return reactions
}

export enum QueueReactions {
  TWO_BACK = '⏪',
  BACK = '◀',
  NEXT = '▶',
  TWO_NEXT = '⏩',
}

export class FormatQueueArgs {
  private _pageSize = 5

  constructor(
    public queue: Track[],
    public currentTrack: number,
    public start: number = 0,
    public currentPage: number = 0,
  ) { }

  get nrTracksLeftStr() {
    return this.tracksLeft <= 0
      ? 'No'
      : `${this.tracksLeft}`
  }

  get hasMoreThanTwoPagesLeft() {
    return this._pageSize * 2 < this.queue.length - this.start
  }

  get hasMoreThanTwoPagesPrevious() {
    return this.currentPage > 1
  }

  get tracksLeft() {
    return this.queue.length - this.end
  }

  get hasMorePages() {
    return this.end < this.queue.length
  }

  get hasPreviousPages() {
    return this.currentPage > 0
  }

  get nextPage() {
    return this.withPage(this.currentPage + 1)
  }

  get previousPage() {
    return this.withPage(this.currentPage - 1)
  }

  private withPage(newPage: number) {
    return new FormatQueueArgs(
      this.queue,
      this.currentTrack,
      this.currentTrack + this._pageSize * newPage,
      newPage,
    )
  }

  get end() {
    return this.start + this._pageSize
  }
}
