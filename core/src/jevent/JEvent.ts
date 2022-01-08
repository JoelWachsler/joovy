import { Client, Message, TextChannel } from 'discord.js'
import { defer, from, map, mergeMap, Observable, of } from 'rxjs'
import JMessage, { from as jMessageFrom, MessageKey } from '../JMessage'
import { EventStore } from './EventStore'
import { Factory } from './Factory'
import { WithBaseFunctionality } from './mixin/BaseFunctionality'
import WithFactory from './mixin/Factory'
import WithSendMessage from './mixin/SendMessage'
import { ResultFactory } from './Result'
import { SendMessage } from './SendMessage'

/**
 * "JEvent" or "Joovy Event" represents an interaction a user or bot has created.
 * 
 * The main reason for this interface is to make it easier to create "mock"
 * implementations of a user interaction.
 */
export default interface JEvent extends ResultFactory, Factory, EventStore, SendMessage {
  readonly message: JMessage
  readonly timestamp: number,
}

const messageStore = new Map<string, Map<string, unknown>>()

const getOrCreateStore = (id: string) => {
  let store = messageStore.get(id)
  if (!store) {
    store = new Map()
    messageStore.set(id, store)
  }

  return store
}

export const removeObjectStore = (event: JEvent) => {
  return defer(() => {
    const channelId = event.message.channelId
    messageStore.delete(channelId)

    return event.result({ store: { event: 'removed', id: channelId } })
  })
}

export const fromMessage = (message: Observable<Message>): Observable<JEvent> => {
  return message.pipe(
    map(message => WithFactory(WithBaseFunctionality(jMessageFrom(message), () => getOrCreateStore(message.channelId), message.createdTimestamp), message)),
    map(EventClass => WithSendMessage(EventClass)),
    map(EventClass => new EventClass()),
  )
}

export const fromMessageKey = (client: Client, messageKey: MessageKey) => {
  return defer(() => from(client.channels.fetch(messageKey.channelId))).pipe(
    mergeMap(channel => channel ? [channel] : []),
    mergeMap(channel => channel instanceof TextChannel ? [channel] : []),
    mergeMap(textChannel => textChannel.messages.fetch()),
    map(messages => messages.get(messageKey.messageId)),
    mergeMap(message => message ? [message] : []),
    mergeMap(message => fromMessage(of(message))),
  )
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type Constructor<T = {}> = new (...args: any[]) => T
export type BaseConstructor<T extends JMessage = JMessage> = Constructor<{ message: T }>

export const Base = <T extends JMessage = JMessage>(message: T, timestamp: number) => {
  return class {
    message = message
    timestamp = timestamp
  }
}