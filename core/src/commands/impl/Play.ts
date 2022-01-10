import { catchError, map, merge, mergeMap, Observable } from 'rxjs'
import JEvent from '../../jevent/JEvent'
import { Result } from '../../jevent/Result'
import Track, { from as trackFrom } from '../../player/Track'
import { getOrCreatePlaylist } from '../../playlist/Playlist'
import ArgParser from '../ArgParser'
import Command from '../command'

export default class Play implements Command {
  argument = ArgParser.create('play')
    .withArg('url', arg => arg.or('query'))
  helpText = 'Play a track or queue it if a track is already playing.'

  handleMessage(event: JEvent): Observable<Result> {
    const playlistFromEvent = (event: JEvent, track: Track) => {
      return getOrCreatePlaylist(event).pipe(
        mergeMap(({ playlist, results: results }) => merge(results, playlist.add(event, track))),
      )
    }

    const msgWithoutPlay = event.message.content.replace('/play ', '')

    return event.factory.ytSearch(msgWithoutPlay).pipe(
      catchError(err => {
        throw Error(`Failed to add: ${msgWithoutPlay}, reason: ${err}`)
      }),
      map(info => trackFrom({ event, info })),
      mergeMap(track => playlistFromEvent(event, track)),
    )
  }
}
