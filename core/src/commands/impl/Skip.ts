import { mergeMap, mergeMapTo, Observable } from 'rxjs'
import JEvent from '../../jevent/JEvent'
import { Result } from '../../jevent/Result'
import { getPlaylist } from '../../playlist/Playlist'
import ArgParser from '../ArgParser'
import Command from '../command'

export default class Skip implements Command {
  argument = ArgParser.create('skip')
  helpText = 'Skip the current track.'

  handleMessage(event: JEvent): Observable<Result> {
    return getPlaylist(event).pipe(
      mergeMap(playlist => playlist.skipCurrentTrack()),
      mergeMapTo(event.result({ skipped: true })),
    )
  }
}
