import { DiscordAPIError } from 'discord.js'
import JEvent from './jevent/JEvent'
import logger from './logger'

export const errorHandler = (event: JEvent, err: any) => {
  if (err instanceof Error) {
    logger.error(`${err.message} ${err.stack}`)
  }

  if (err instanceof DiscordAPIError) {
    const customErrMsg = customErrorMessages.get(err.code)
    if (customErrMsg) {
      return event.sendMessage(customErrMsg)
    }
  }

  return event.sendMessage(err.message)
}

const customErrorMessages = new Map<number, string>()
customErrorMessages.set(50013, 'Couldn\'t remove reactions, does the bot have the \'Manage Messages\' permission?')
