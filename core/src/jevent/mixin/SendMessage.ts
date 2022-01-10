import { MessageEmbed } from 'discord.js'
import { mergeMap, Observable } from 'rxjs'
import JMessage from '../../JMessage'
import JEvent, { BaseConstructor } from '../JEvent'
import { Result } from '../Result'
import { SendMessage } from '../SendMessage'

const WithSendMessage = <TBase extends BaseConstructor>(Base: TBase) => {
  return class extends Base implements SendMessage {
    sendMessage(message: string | MessageEmbed): Observable<Result<JMessage>> {
      return sendMessage({
        event: this as unknown as JEvent,
        message,
        messageSender: msg => this.message.send({ embeds: [msg] }),
        indent: 2,
      })
    }
  }
}

export interface SendMessageArgs {
  message: string | MessageEmbed
  messageSender: MessageSender
  event: JEvent
  indent: number
}

export const sendMessage = ({ message, messageSender, event, indent }: SendMessageArgs) => {
  let msg = message

  if (typeof msg === 'string') {
    msg = new MessageEmbed()
      .setDescription(msg)
  }

  const jsonMsg = msg.toJSON()

  return messageSender(msg).pipe(
    mergeMap(sentMessage => {
      return event.complexResult({
        result: {
          messageSent: `${JSON.stringify(jsonMsg, null, indent)}`,
        },
        item: sentMessage,
      })
    }),
  )
}

type MessageSender = (message: MessageEmbed) => Observable<JMessage>

export default WithSendMessage
