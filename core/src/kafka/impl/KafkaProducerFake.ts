import { defer, Observable } from 'rxjs'
import { Result } from '../../jevent/Result'
import { KafkaProducer, SendArgs } from '../kafka'

export class KafkaProducerFake implements KafkaProducer {

  send({ message, topic, event }: SendArgs): Observable<Result> {
    return defer(() => event.result({ kafka: { message, topic } }))
  }
}
