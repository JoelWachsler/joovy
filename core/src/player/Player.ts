import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice'
import { Message, VoiceChannel } from 'discord.js'
import { defer, map, mapTo, Observable } from 'rxjs'
import logger from '../logger'
import Track from './Track'
import * as Ytdl from './Ytdl'

export default interface Player {
  play(track: Track): Observable<Track>
  disconnect(): void
  idle(cancel: Observable<void>, isLastTrack: () => boolean): Observable<void>
}

export type Factory = Observable<Player>

export const from = (message: Message): Observable<Player> => {
  return defer(() => {
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

    return new Observable<Player>(observer => {
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
  })
}

class PlayerImpl implements Player {
  private bass = 3
  private volume = 0.25
  private begin = 0

  constructor(private player: AudioPlayer, private connection: VoiceConnection) { }

  play(track: Track): Observable<Track> {
    return this.createReadStream(track)
      .pipe(
        map(dl => createAudioResource(dl)),
        map(resource => this.player.play(resource)),
        mapTo(track),
      )
  }

  idle(cancel: Observable<void>, isLastTrack: () => boolean): Observable<void> {
    return new Observable(subscribe => {
      const complete = () => {
        subscribe.next(undefined)
        subscribe.complete()
        if (isLastTrack()) {
          this.player.stop()
        }
      }

      cancel.subscribe(complete)
      this.player.once(AudioPlayerStatus.Idle, complete)
    })
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
