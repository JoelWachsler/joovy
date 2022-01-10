import { Client } from 'discord.js'
import { concat, mergeMap, Observable, of } from 'rxjs'
import JEvent, { fromMessageKey } from '../../jevent/JEvent'
import { Result } from '../../jevent/Result'
import { KMessage, Topics } from '../../kafka/kafka'
import { createConsumer } from '../../kafka/util'
import { removePlaylist } from '../../playlist/Playlist'
import { logResult } from '../../resultLogger'
import { removeObjectStore } from '../../store/util'
import ArgParser from '../ArgParser'
import Command from '../command'

export default class Disconnect implements Command {
  argument = ArgParser.create('disconnect')
  helpText = 'Disconnects the bot from the current channel.'

  handleMessage(event: JEvent): Observable<Result> {
    return sendDisconnectMessage(event, `manual disconnect by: ${JSON.stringify(event.message.author)}`)
  }
}

export const handleDisconnects = (client: Client) => {
  const disconnectHandler = createConsumer<DisconnectMessage>({ groupId: 'joovy-disconnect-handler', topic: Topics.Disconnect })
    .pipe(
      mergeMap(message => {
        return fromMessageKey(client, message.meta.messageKey)
          .pipe(mergeMap(event => disconnectFromChannel(of({ event, reason: message.reason }))))
      }),
    )

  logResult('disconnect', disconnectHandler)
}

export const disconnectFromChannel = (disconnectEvent: Observable<{ event: JEvent, reason: string }>) => {
  return disconnectEvent.pipe(mergeMap(({ event, reason }) => {
    const disconnectReason = event.result({ disconnect: reason })
    const playlistRemoval = removePlaylist(event)
    const removeChannelStore = removeObjectStore(event)
    const sendByeMessage = event.sendMessage('Bye!')

    return concat(
      disconnectReason,
      playlistRemoval,
      removeChannelStore,
      sendByeMessage,
    )
  }))
}

type DisconnectMessage = KMessage<'disconnect', '1'> & { reason: string }

const createDisconnectMessage = (event: JEvent, reason: string): DisconnectMessage => {
  return {
    meta: {
      messageKey: event.message.messageKey,
      name: 'disconnect',
      version: '1',
    },
    reason,
  }
}

export const sendDisconnectMessage = (event: JEvent, reason: string) => {
  return event.factory.kafkaProducer().pipe(mergeMap(producer => {
    return producer.send({
      topic: Topics.Disconnect,
      event,
      message: createDisconnectMessage(event, reason),
    })
  }))
}
