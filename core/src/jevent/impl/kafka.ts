import { Producer } from 'kafkajs'
import { Observable } from 'rxjs'
import { KafkaProducerImpl } from '../../kafka/impl/KafkaProducerImpl'
import { KafkaProducer } from '../../kafka/kafka'
import { createKafkaClient } from '../../kafka/util'
import logger from '../../logger'

let producer: Producer

export const kafkaProducerFactoryImpl = () => {
  return new Observable<KafkaProducer>(subscribe => {
    if (!producer) {
      logger.info('Initializing kafka...')
      producer = createKafkaClient().producer()
      producer.on('producer.connect', () => {
        logger.info('Kafka has been initialized!')
      })
    }

    producer.connect().then(() => {
      subscribe.next(new KafkaProducerImpl(producer))
      subscribe.complete()
    })
  })
}
