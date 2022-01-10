import { Kafka } from 'kafkajs'
import { defer, from, mapTo, mergeMap, Observable, tap } from 'rxjs'
import initConfig from '../config'
import logger from '../logger'
import { KMessage } from './kafka'

let kafka: Kafka

/**
 * Internal implementation detail, do not use.
 */
export const createKafkaClient = () => {
  if (!kafka) {
    const kafkaConfig = initConfig().kafka

    kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    })
  }

  return kafka
}

type CreateConsumerArgs = {
  topic: string
  groupId: string
}

export const createConsumer = <T extends KMessage = KMessage>(args: CreateConsumerArgs) => {
  const { groupId, topic } = args

  const create = defer(() => {
    logger.info(`Creating consumer with the following args: ${JSON.stringify(args)}`)
    const consumer = createKafkaClient().consumer({ groupId })

    return from(consumer.connect()).pipe(mapTo(consumer))
  })

  const connectToTopic = create.pipe(mergeMap(consumer => {
    logger.info(`Subscribing to topic: ${topic}...`)
    return from(consumer.subscribe({ topic, fromBeginning: true })).pipe(
      tap(() => logger.info(`Subscribed to topic: ${topic}!`)),
      mapTo(consumer),
    )
  }))

  return connectToTopic.pipe(mergeMap(consumer => {
    return new Observable<T>(subscribe => {
      consumer.run({
        async eachMessage({ message, topic }) {
          const msgAsString = message.value?.toString()
          if (!msgAsString) {
            logger.error(`Invalid message: ${message} for topic: ${topic}`)
            return
          }

          logger.info(`New incoming message: ${JSON.stringify(msgAsString)} on topic: ${topic}`)

          subscribe.next(JSON.parse(msgAsString))
        },
      })
    })
  }))
}