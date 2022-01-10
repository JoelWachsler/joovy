import { buildSubgraphSchema } from '@apollo/federation'
import { ApolloServer, gql, ServerInfo } from 'apollo-server'
import { Observable } from 'rxjs'
import config from '../config'
import logger from '../logger'
import { BackupV1, backupV1, restoreV1 } from '../playlist/PlaylistTracker'

const typeDefs = gql`
type Query {
  backupV1: String!
}

type Mutation {
  restoreV1(backup: String!): Boolean
}
`

const apolloInit = () => {
  const server = new ApolloServer({
    schema: buildSubgraphSchema([
      {
        typeDefs,
        resolvers: {
          Query: {
            async backupV1() {
              const res = await backupV1()
              return JSON.stringify(res)
            },
          },
          Mutation: {
            restoreV1(_: any, { backup }: { backup: string }) {
              return restoreV1(JSON.parse(backup) as BackupV1)
            },
          },
        },
      },
    ]),
    formatError(err) {
      logger.error(`GraphQL error: ${err}`)
      return err
    },
  })

  const info = new Observable<ServerInfo>(subscribe => {
    server.listen({ port: config().graphQLPort }).then(serverInfo => {
      subscribe.next(serverInfo)
    })
  })

  info.subscribe(info => {
    logger.info(`GraphQL available at: ${info.url}`)
    logger.info(`Health check available at: ${info.url}.well-known/apollo/server-health`)
  })
}

export default apolloInit