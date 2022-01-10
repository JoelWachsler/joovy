import { concat, concatMap, mergeMap, Observable, of } from 'rxjs'
import JEvent from '../../jevent/JEvent'
import { Result } from '../../jevent/Result'
import { getPlaylist, Playlist } from '../../playlist/Playlist'
import ArgParser from '../ArgParser'
import Command from '../command'

export default class Remove implements Command {
  argument = ArgParser.create('remove')
    .withArg('fromIndex')
    .withOptionalArg('toIndex')
  helpText = 'Removes specified track(s).'

  handleMessage(event: JEvent): Observable<Result> {
    return getPlaylist(event).pipe(
      mergeMap(playlist => {
        const splitRemoveCmd = event.message.content.split(' ')
        const from = Number(splitRemoveCmd[1])
        const to = Number(splitRemoveCmd[2] ?? from)

        return this.remove(event, playlist, from, to)
      }),
    )
  }

  remove(event: JEvent, playlist: Playlist, from: number, to: number) {
    return of(playlist).pipe(
      mergeMap(playlist => {
        let buildRemoveCmd = playlist.remove(from)
        for (let i = from + 1; i < to + 1; i++) {
          buildRemoveCmd = concat(buildRemoveCmd, playlist.remove(i))
        }

        return buildRemoveCmd
      }),
      concatMap(removedTrack => event.sendMessage(`${removedTrack.name} has been removed.`)),
    )
  }
}
