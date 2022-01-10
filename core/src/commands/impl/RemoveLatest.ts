import { mergeMap, Observable } from 'rxjs'
import JEvent from '../../jevent/JEvent'
import { Result } from '../../jevent/Result'
import { getPlaylist } from '../../playlist/Playlist'
import ArgParser from '../ArgParser'
import Command from '../command'
import Remove from './Remove'

export default class RemoveLatest implements Command {
  argument = ArgParser.create('removelatest')
  helpText = 'Removes the last added track.'
  private remove = new Remove()

  handleMessage(event: JEvent): Observable<Result> {
    return getPlaylist(event).pipe(
      mergeMap(playlist => {
        const indexToRemove = playlist.queueLength - 1
        return this.remove.remove(event, playlist, indexToRemove, indexToRemove)
      }),
    )
  }
}
