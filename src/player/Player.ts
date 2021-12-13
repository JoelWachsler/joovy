import { AudioPlayer, createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice'
import { Message, VoiceChannel } from 'discord.js'
import { map, mergeMap, Observable } from 'rxjs'
import JEvent from '../jevent/JEvent'
import logger from '../logger'
import * as Ytdl from './Ytdl'

export default interface Player {
  play(track: Track): Observable<void>
  disconnect(): void
}

export interface Track {
  name: string
  link: string
}

export type Factory = Observable<Player>

const PLAYER_KEY = 'player'

export const getPlayer = (event: JEvent): Observable<Player> => {
  return event.store.object.pipe(
    mergeMap(store => store.get(PLAYER_KEY)),
    map(player => player as Player),
  )
}

export const createPlayer = (event: JEvent): Observable<Player> => {
  const addPlayerToStore = (player: Player) => event.store.object
    .pipe(mergeMap(store => store.put(PLAYER_KEY, player)))

  return event.factory.player.pipe(mergeMap(addPlayerToStore))
}

export const disconnectPlayer = (event: JEvent): Observable<void> => {
  return getPlayer(event)
    .pipe(map(player => player.disconnect()))
}

export const removePlayerFromStore = (event: JEvent): Observable<void> => {
  return event.store.object
    .pipe(mergeMap(store => store.remove(PLAYER_KEY)))
}

export const from = (message: Message): Observable<Player> => {
  const throwError = (err: string) => {
    throw Error(`Unable to join voice channel: ${err}`)
  }

  const voiceChannel = message.member?.voice.channel ?? throwError('Could not determine voice channel')
  logger.info(`Joining channel: ${voiceChannel?.id}...`)

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  })

  const player = createAudioPlayer()
  connection.subscribe(player)

  return new Observable(observer => {
    connection.once(VoiceConnectionStatus.Ready, () => {
      logger.info('Connection is ready')

      if (voiceChannel instanceof VoiceChannel) {
        observer.next(new PlayerImpl(player, connection))
        observer.complete()
      } else {
        observer.error(`Voice channel was not correct type, got: ${typeof voiceChannel}, expected: ${typeof VoiceChannel}`)
      }
    })
  })
}

class PlayerImpl implements Player {
  private bass = 3
  private volume = 0.25
  private begin = 0

  constructor(private player: AudioPlayer, private connection: VoiceConnection) { }

  play(track: Track) {
    return this.createReadStream(track)
      .pipe(
        map(dl => createAudioResource(dl)),
        map(resource => this.player.play(resource)),
      )
  }

  private createReadStream(track: Track) {
    return Ytdl.createStream({
      url: track.link,
      options: {
        encoderArgs: ['-af', `bass=g=${this.bass},dynaudnorm=f=200,volume=${this.volume}`],
        opusEncoded: true,
        seek: (this.begin ?? 0) / 1000,
      },
      ytdlOptions: {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
      },
    })
  }

  disconnect() {
    this.player.stop()
    this.connection.disconnect()
  }
}