import { Client, Intents, Message } from 'discord.js'
import { fromEvent, Observable } from 'rxjs'
import apolloInit from './apollo/apollo'
import { handleDisconnects } from './commands/impl/Disconnect'
import config from './config'
import * as Event from './jevent/JEvent'
import logger from './logger'
import { handleMessageEvents, sendMessageEvent } from './messageHandler'
import { logResult } from './resultLogger'

const main = async () => {
  logger.info('Creating client...')
  const client = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      Intents.FLAGS.GUILD_VOICE_STATES,
    ],
  })

  client.once('ready', () => {
    logger.info('Client is ready!')

    handleMessageEvents(client)
    handleDisconnects(client)

    const msgEvent = fromEvent(client, 'messageCreate') as Observable<Message>
    logResult('main', sendMessageEvent(msgEvent.pipe(Event.fromMessage)))
  })

  client.login(config().token)
  logger.info('Done creating client!')

  apolloInit()
}

if (require.main === module) {
  main()
}
