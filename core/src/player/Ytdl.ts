import { FFmpeg, opus as Opus } from 'prism-media'
import { defer, from, map, Observable } from 'rxjs'
import { Readable } from 'stream'
import ytdl, { downloadOptions as DownloadOptions } from 'ytdl-core'
import logger from '../logger'

export const createStream = (args: CreateStreamArgs): Observable<Readable> => {
  return createYtdlStream(args.url, args.ytdlOptions)
    .pipe(map(inputStream => createOggOutputStream({ streamArgs: args, inputStream })))
}

const createYtdlStream = (url: string, options?: DownloadOptions): Observable<Readable> => {
  // add &bpctr=9999999999 to prevent age restriction errors
  return defer(() => from(ytdl.getInfo(`${url}&bpctr=9999999999`)))
    .pipe(map(info => ytdl.downloadFromInfo(info, options)))
}

const ytdlEvents = [
  'abort',
  'error',
  'info',
  'progress',
  'reconnect',
  'redirect',
  'request',
  'response',
  'retry',
]

type CreateStreamArgs = {
  url: string
  options?: StreamOptions
  ytdlOptions?: DownloadOptions
}

type StreamOptions = {
  seek?: number
  encoderArgs?: string[]
  fmt?: string
  opusEncoded?: boolean
}

const createFfmpegArgs = ({ options }: CreateStreamArgs) => {
  let ffmpegArgs = [
    '-analyzeduration',
    '0',
    '-loglevel',
    '0',
    '-acodec',
    'libopus',
    '-f',
    'opus',
    '-ar',
    '48000',
    '-ac',
    '2',
  ]

  if (options?.seek) {
    ffmpegArgs = ['-ss', options.seek.toString(), ...ffmpegArgs]
  }

  if (options?.encoderArgs) {
    ffmpegArgs = [...ffmpegArgs, ...options.encoderArgs]
  }

  return ffmpegArgs
}

type CreateOggOutputStreamArgs = { streamArgs: CreateStreamArgs, inputStream: Readable } 

const createOggOutputStream = ({ streamArgs, inputStream }: CreateOggOutputStreamArgs) => {
  const transcoder = new FFmpeg({ args: createFfmpegArgs(streamArgs) })
  const output = inputStream.pipe(transcoder)
  const opus = new Opus.OggDemuxer()

  const outputStream = output.pipe(opus)
  output.on('error', e => outputStream.emit('error', e))

  ytdlEvents.forEach(event => inputStream.on(event, (...args) => outputStream.emit(event, args)))

  outputStream.on('close', () => {
    logger.info('Output stream closed')
    transcoder.destroy()
    opus.destroy()
  })

  return outputStream
}