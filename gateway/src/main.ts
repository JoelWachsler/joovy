import { ApolloGateway } from '@apollo/gateway'
import { ApolloServer } from 'apollo-server'
import * as dotenv from 'dotenv'
import fs from 'fs'
import logger from './logger'

const main = async () => {
  const config = initConfig()

  const supergraphSdl = config.dynamicSchemaGeneration
    ? undefined
    : fs.readFileSync('supergraph.gql').toString()

  const gateway = new ApolloGateway({
    supergraphSdl,
    serviceList: [
      {
        name: 'core',
        url: config.service.core,
      },
    ],
  })
  const server = new ApolloServer({
    gateway,
    formatError(err) {
      logger.error(`GraphQL error: ${err}`)
      return err
    },
  })

  const serverInfo = await server.listen({ port: config.port })

  logger.info(`GraphQL gateway available at: ${serverInfo.url}`)
  logger.info(`Health check available at: ${serverInfo.url}.well-known/apollo/server-health`)
}

const initConfig = () => {
  dotenv.config()

  return {
    port: process.env.GRAPHQL_PORT ?? '3000',
    dynamicSchemaGeneration: Boolean(process.env.DYNAMIC_SCHEMA_GENERATION ?? 'true'),
    service: {
      core: process.env.CORE_SERVICE ?? 'http://localhost:3001/graphql',
    },
  }
}

if (require.main === module) {
  main()
}
