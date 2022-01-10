import * as dotenv from 'dotenv'

export type Config = ReturnType<typeof init>

const init = () => {
  // init config from .env
  dotenv.config()

  return {
    token: process.env.TOKEN ?? throwError('No token defined...'),
    applicationId: process.env.APPLICATION_ID ?? throwError('Application id is not defined...'),
    testGuildId: process.env.TEST_GUILD_ID,
    dbLocation: process.env.DB_LOCATION ?? './db',
    graphQLPort: process.env.GRAPHQL_PORT ?? '3001',
    kafka: {
      clientId: process.env.KAFKA_CLIENT_ID ?? 'joovy-core',
      brokers: [process.env.KAFKA_BROKERS ?? 'kafka:9092'],
    },
  }
}

const throwError = (error: string) => {
  throw Error(error)
}

let config: Config

const initConfig = () => {
  if (!config) {
    config = init()
  }

  return config
}

export default initConfig
