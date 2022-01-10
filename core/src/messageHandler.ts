import { Client } from 'discord.js'
import { catchError, filter, mergeMap, Observable } from 'rxjs'
import { handle } from './commands/command'
import { errorHandler } from './errorHandler'
import JEvent, { fromMessageKey } from './jevent/JEvent'
import { EmptyResult, Result } from './jevent/Result'
import { KMessage, Topics } from './kafka/kafka'
import { createConsumer } from './kafka/util'
import { logResult } from './resultLogger'

export const sendMessageEvent = (event: Observable<JEvent>): Observable<Result> => {
  return event.pipe(mergeMap(event => {
    return event.factory.kafkaProducer().pipe(mergeMap(producer => {
      return producer.send({
        event,
        message: createMessageEvent(event),
        topic: Topics.NewMessage,
      })
    }))
  }))
}

export const handleMessageEvents = (client: Client) => {
  const messageHandling = createConsumer<MessageEvent>({ groupId: 'joovy-message-handler', topic: Topics.NewMessage }).pipe(
    mergeMap(msg => fromMessageKey(client, msg.meta.messageKey)),
    handleMessage,
  )

  logResult('handleMessageEvents', messageHandling)
}

export const handleMessage = (event: Observable<JEvent>): Observable<Result> => {
  return event.pipe(
    mergeMap(event => {
      const message = event.message
      if (message.author.bot) {
        return event.result({ ignored: `${message.content} was sent by a bot` })
      } else if (!message.content.startsWith('/')) {
        return event.result({ ignored: `${message.content} does not start with a slash` })
      } else {
        return handle(event).pipe(
          filter(r => !(r instanceof EmptyResult)),
          catchError(err => errorHandler(event, err)),
        )
      }
    }),
  )
}

const createMessageEvent = (event: JEvent): MessageEvent => {
  return {
    meta: {
      messageKey: event.message.messageKey,
      name: 'message-event',
      version: '1',
    },
    content: event.message.content,
  }
}

type MessageEvent = KMessage<'message-event', '1'> & { content: string }
