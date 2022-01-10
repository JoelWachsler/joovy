import { MessageEmbed } from 'discord.js'
import { rxSandbox, RxSandboxInstance } from 'rx-sandbox'
import { defer, delay, map, Observable, ObservableInput, of, timeout } from 'rxjs'
import { TimeoutConfig, TimeoutInfo } from 'rxjs/internal/operators/timeout'
import JEvent from '../jevent/JEvent'
import { WithBaseFunctionality } from '../jevent/mixin/BaseFunctionality'
import { StoreOverride } from '../jevent/mixin/EventStore'
import { sendMessage } from '../jevent/mixin/SendMessage'
import { Result } from '../jevent/Result'
import { YtSearchResult } from '../jevent/YtSearchResult'
import JMessage, { JReaction, MessageContent, MessageKey } from '../JMessage'
import { KafkaProducerFake } from '../kafka/impl/KafkaProducerFake'
import { handleMessage } from '../messageHandler'
import Player from '../player/Player'
import { getOrCreateStringStore } from '../store/impl/InMemoryStore'
import { PlayerFake } from './PlayerFake'

export let sandbox: RxSandboxInstance
export let e: RxSandboxInstance['e']
export let hot: RxSandboxInstance['hot']
export let store: Map<string, unknown>
export let player: Player
export const date = new Date(2000, 1, 1)
let uuidCounter: number
let messageCounter: number

beforeEach(() => {
  sandbox = rxSandbox.create(true)
  e = sandbox.e
  hot = sandbox.hot
  store = new Map()
  player = new PlayerFake(sandbox.scheduler)
  uuidCounter = 0
  messageCounter = 0
})

export const handle = (source: Observable<any>) => resultAndMessages(handleMessage(source))

export const results = <T extends Observable<{ result: any }>>(source: T) => source.pipe(map(s => s.result))

export const resultAndMessages = <T extends Observable<{ result: any }>>(source: T) => sandbox.getMessages(results(source))

class JMessageFake implements JMessage {

  channelId: string
  author: JMessage['author']
  content: string
  private _reactions: string[] = []

  constructor(input?: Partial<JMessage>) {
    this.channelId = input?.channelId ?? 'testChannelId'
    const defaultAuthor = {
      username: 'testuser',
      bot: false,
      id: 'testAuthorId',
    }
    this.author = input?.author ?? defaultAuthor
    this.content = input?.content ?? 'testContent'
  }

  get messageKey(): MessageKey {
    return {
      channelId: this.channelId,
      messageId: `${messageCounter++}`,
    }
  }

  get clearReactions(): Observable<JMessage> {
    return defer(() => {
      this._reactions = []
      return of(this)
    })
  }

  get reactions(): Observable<JReaction> {
    return of()
  }

  edit(_: MessageContent): Observable<JMessage> {
    return of(this)
  }

  react(reaction: string): Observable<JMessage> {
    return defer(() => {
      this._reactions.push(reaction)
      return of(this)
    })
  }

  send(_: MessageContent): Observable<JMessage> {
    return of(this)
  }
}

export const createTestEvent = (input?: Partial<JMessage>): JEvent => {
  const message = new JMessageFake(input)
  const storeOverride: StoreOverride = { persistentString: getOrCreateStringStore({ message, storeProvider: () => store }) }
  return new class EventFake extends WithBaseFunctionality(message, () => store, date.getTime(), storeOverride) {
    get factory() {
      return {
        uuid: () => `totally-random-uuid-${uuidCounter++}`,
        player: of(player),
        delay: <T>(ms: number) => delay<T>(ms, sandbox.scheduler),
        timeout: <T, O extends ObservableInput<any>, M>(
          config: TimeoutConfig<T, O, M> & { with: (info: TimeoutInfo<T, M>) => O },
        ) => timeout<T, O, M>({ ...config, scheduler: sandbox.scheduler }),
        ytSearch(query: string): Observable<YtSearchResult> {
          return of({
            url: `https://${query}.com`,
            title: `${query}`,
            timestamp: '1:10',
          })
        },
        kafkaProducer: () => of(new KafkaProducerFake()),
      }
    }

    sendMessage(messageToSend: string | MessageEmbed): Observable<Result> {
      return sendMessage({
        message: messageToSend,
        event: this as unknown as JEvent,
        messageSender: _ => of(message),
        indent: 2,
      })
    }
  }
}
