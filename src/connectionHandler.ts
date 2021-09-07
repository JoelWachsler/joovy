import { Message, MessageEmbed } from 'discord.js'
import { catchError, filter, map, Observable, share, Subject } from 'rxjs'
import { logger } from './logger'
import { MsgEvent } from './main'
import { ObservablePlaylist } from './observablePlaylist'
import { Player } from './player'
import { QueryResolver } from './queryResolver'

export interface QueueItem {
  name: string
  link: string
  message: Message
  skipped?: boolean
}

export type SendMessage = (msg: MsgType) => Promise<void>

type MsgType = string | MessageEmbed
interface SendMessageArgs {
  msg: MsgType
  message: Message
}

export const initMsgHandler = (msgObservable: Observable<MsgEvent>) => {
  const msgObservers = new Map<string, Subject<MsgEvent>>()
  msgObservable.pipe(
    // Ignore bot messages
    filter(v => !v.message.author.bot),
    // Only process messages starting with a slash
    filter(v => v.message.content.startsWith('/')),
    map(v => {
      const channelId = v.message.member?.voice.channel?.id
      if (!channelId) {
        throw new ErrorWithMessage('Could not determine channel id, are you joined to a voice channel?', v.message)
      }
      return {
        ...v,
        channelId,
      }
    }),
    catchError((e, caught) => {
      if (e instanceof ErrorWithMessage) {
        sendMessage({
          msg: e.errorMsg,
          message: e.message,
        })
      } else {
        logger.error(`Caught an error: "${e}"`)
      }
      return caught
    }),
    share(),
  ).subscribe(async v => {
    if (!msgObservers.has(v.channelId)) {
      const subject = new Subject<MsgEvent>()
      msgObservers.set(v.channelId, subject)
      logger.info(`Initializing new observer for: ${v.channelId}`)
      await initCmdObserver(v.message, subject, () => msgObservers.delete(v.channelId))
    }

    msgObservers.get(v.channelId)!.next(v)
  })
}

const initCmdObserver = async (
  message: Message,
  channelObserver: Subject<MsgEvent>,
  unsubscribe: () => void,
) => {
  const channelObserverWithMsg = channelObserver
    .pipe(map(v => ({ ...v, content: v.message.content })))

  const env = initEnvironment()

  env.sendMessage.subscribe(msg => {
    const embed = new MessageEmbed().setDescription(msg)
    message.channel.send({
      embeds: [embed]
    })
  })

  ObservablePlaylist.init(env)
  await Player.init({ message, env })

  env.addItemToQueue.subscribe(({ name }) => {
    env.sendMessage.next(`${name} has been added to the queue.`)
  })

  env.addNextItemToQueue.subscribe(({ name }) => {
    env.sendMessage.next(`${name} will be played next.`)
  })

  const printHelp = () => {
    const commands = [
      {
        name: '/play url | query',
        help: 'Play a track or queue it if a track is already playing.',
      },
      {
        name: '/playnext url | query',
        help: 'Skips the queue and adds the track as the next song.',
      },
      {
        name: '/skip',
        help: 'Skip the current track.',
      },
      {
        name: '/bass level',
        help: 'Set the bass level of the current and the following songs.',
      },
      {
        name: '/seek seconds | minutes:seconds',
        help: 'Seek current playing song to the provided time.',
      },
      {
        name: '/queue',
        help: 'Print the current queue.',
      },
      {
        name: '/remove fromIndex [toIndex]',
        help: 'Skip the current track.',
      },
      {
        name: '/disconnect',
        help: 'Disconnects the bot from the current channel.',
      },
      {
        name: '/help',
        help: 'Print this message.',
      },
    ]
    const help = new MessageEmbed()
      .setTitle('Available commands')
      .addFields(commands.map(cmd => ({
        name: cmd.name,
        value: cmd.help,
      })))

    message.channel.send({
      embeds: [help],
    })
  }

  const observer = channelObserverWithMsg.subscribe({
    next: async v => {
      const { content, message, pool } = v

      const addItemToQueue = async (cb: (item: Omit<ObservablePlaylist.Item, 'index'>) => void) => {
        try {
          const newItem = await QueryResolver.resolve({ message, pool })
          if (newItem) {
            cb(newItem)
          } else {
            env.sendMessage.next(`Unable to find result for: ${content}`)
          }
        } catch (e) {
          logger.error(e)
          env.sendMessage.next(`Unable to add song to playlist: ${e}`)
        }
      }

      if (content.startsWith('/playnext')) {
        addItemToQueue(newItem => env.addNextItemToQueue.next(newItem))
      } else if (content.startsWith('/play')) {
        addItemToQueue(newItem => env.addItemToQueue.next(newItem))
      } else if (content === '/help') {
        printHelp()
      } else if (content.startsWith('/seek')) {
        const seek = content.split('/seek ')[1]
        if (seek) {
          const splitSeek = seek.split(':')
          if (splitSeek.length > 1) {
            const minutes = Number(splitSeek[0] ?? 0)
            const seconds = Number(splitSeek[1] ?? 0)
            env.seek.next(minutes * 60 + seconds)
          } else {
            env.seek.next(Number(seek ?? 0))
          }
        }
      } else if (content === '/skip') {
        env.nextItemInPlaylist.next(null)
      } else if (content.startsWith('/bass')) {
        env.setBassLevel.next(Number(content.split(' ')[1]))
      } else if (content.startsWith('/remove')) {
        const removeCmd = content.split(' ')
        const from = Number(removeCmd[1])
        const to = Number(removeCmd[2] ?? from)
        env.removeFromQueue.next({ from, to })
      } else if (content === '/queue') {
        env.printQueueRequest.next(null)
      } else if (content === '/disconnect') {
        env.disconnect.next(null)
      } else {
        env.sendMessage.next(`Unknown command: \`${content}\`, type \`/help\` for available commands.`)
      }
    },
  })

  env.disconnect.subscribe(_ => {
    env.sendMessage.next('Bye!')
    Object.values(env).forEach(envValue => {
      if (envValue instanceof Subject) {
        envValue.complete()
      }
    })
    observer.unsubscribe()
    channelObserver.complete()
    unsubscribe()
  })
}

export interface Environment {
  sendMessage: Subject<string>
  currentlyPlaying: Subject<ObservablePlaylist.Item | null>
  nextItemInPlaylist: Subject<ObservablePlaylist.Item | null>
  addItemToQueue: Subject<Omit<ObservablePlaylist.Item, 'index'>>
  addNextItemToQueue: Subject<Omit<ObservablePlaylist.Item, 'index'>>
  printQueueRequest: Subject<null>
  removeFromQueue: Subject<ObservablePlaylist.Remove>
  disconnect: Subject<null>
  setBassLevel: Subject<number>
  seek: Subject<number>
}

const initEnvironment = (): Environment => {
  return {
    sendMessage: new Subject(),
    currentlyPlaying: new Subject(),
    nextItemInPlaylist: new Subject(),
    addItemToQueue: new Subject(),
    addNextItemToQueue: new Subject(),
    printQueueRequest: new Subject(),
    removeFromQueue: new Subject(),
    disconnect: new Subject(),
    setBassLevel: new Subject(),
    seek: new Subject(),
  }
}

class ErrorWithMessage {
  constructor(public errorMsg: string, public message: Message) { }
}

const sendMessage = async ({ msg, message }: SendMessageArgs) => {
  if (typeof msg === 'string') {
    const embed = new MessageEmbed().setDescription(msg)
    await message.channel.send({
      embeds: [embed]
    })
  } else {
    await message.channel.send({
      embeds: [msg]
    })
  }
}
