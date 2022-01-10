import * as Player from '../player/Player'
import { delayFactoryImpl } from './impl/delay'
import { kafkaProducerFactoryImpl } from './impl/kafka'
import { timeoutFactoryImpl } from './impl/timeout'
import { UUIDFactoryImpl } from './impl/uuid'
import { ytSearchFactoryImpl } from './impl/ytSearch'

export interface Factory {
  readonly factory: {
    readonly player: Player.Factory
    readonly delay: DelayFactory
    readonly timeout: TimeoutFactory
    readonly ytSearch: YtSearchFactory
    readonly uuid: UUIDFactory
    readonly kafkaProducer: KafkaProducerFactory
  }
}

export type DelayFactory = typeof delayFactoryImpl

export type TimeoutFactory = typeof timeoutFactoryImpl

export type YtSearchFactory = typeof ytSearchFactoryImpl

export type UUIDFactory = typeof UUIDFactoryImpl

export type KafkaProducerFactory = typeof kafkaProducerFactoryImpl
