import { Producer } from 'kafkajs'
import { defer, from, mergeMapTo, Observable } from 'rxjs'
import { Result } from '../../jevent/Result'
import { KafkaProducer, SendArgs } from '../kafka'

export class KafkaProducerImpl implements KafkaProducer {
  constructor(private producer: Producer) { }

  send({ message, topic, key, event }: SendArgs): Observable<Result> {
    return defer(() => {
      return from(this.producer.send({
        topic,
        messages: [{
          key,
          value: JSON.stringify(message),
        }],
      })).pipe(
        mergeMapTo(event.result({ kafka: { message, topic } })),
      )
    })
  }
}
