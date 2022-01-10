import { Observable } from 'rxjs'
import JEvent from '../jevent/JEvent'
import { Result } from '../jevent/Result'
import { MessageKey } from '../JMessage'

export interface KafkaProducer {
  send(args: SendArgs): Observable<Result>
}

export enum Topics {
  NewMessage = 'joovy-new-message',
  Disconnect = 'joovy-disconnect',
}

export interface SendArgs<Message = KMessage> {
  topic: string
  key?: string
  message: Message
  event: JEvent
}

export interface KMessage<Name = string, Version = string> {
  meta: KMeta<Name, Version>
  [props: string]: unknown
}

export interface KMeta<Name = string, Version = string> {
  name: Name
  version: Version
  messageKey: MessageKey
}