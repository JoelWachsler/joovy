import { BehaviorSubject, concat, concatMap, concatMapTo, defaultIfEmpty, defer, map, mapTo, merge, mergeAll, mergeMap, mergeMapTo, Observable, of, Subject, switchMap, takeUntil, tap } from 'rxjs'
import { sendDisconnectMessage } from '../commands/impl/Disconnect'
import JEvent from '../jevent/JEvent'
import { Result } from '../jevent/Result'
import Player from '../player/Player'
import Track from '../player/Track'
import { trackPlaylist } from './PlaylistTracker'

export class Playlist {
  private _queue = new Subject<Track>()
  private _cancelled = new Subject<void>()
  private _currentQueue = new BehaviorSubject<Track[]>([])
  private _currentTrack = new BehaviorSubject<number>(0)
  private _skipTrack = new Subject<void>()

  constructor(private event: JEvent, private player: Player) { }

  isEndOfPlaylist() {
    return this._currentQueue.getValue().length <= this._currentTrack.getValue()
  }

  get results(): Observable<Result> {
    return merge(
      this.addedToQueueEvent(),
      this.disconnectIfIdleEvent(this.playerEvents()),
      trackPlaylist(this.event, this),
    )
  }

  private addedToQueueEvent() {
    return this._queue.pipe(
      tap(track => {
        const queue = this._currentQueue.getValue()
        this._currentQueue.next([...queue, track])
      }),
      mergeMap(track => this.event.sendMessage(`${track.name} has been added to the queue`)),
    )
  }

  private incrementCurrentTrack() {
    const { currentTrack, queue } = this.currentQueue
    if (currentTrack > queue.length - 1) {
      return this._currentTrack.next(queue.length)
    } else {
      return this._currentTrack.next(currentTrack + 1)
    }
  }

  private playerEvents() {
    return this._queue.pipe(
      concatMap(track => {
        if (track.removed) {
          return concat(this.removed(track), this.createIdleEvent())
        } else {
          return merge(this.waitForPlayerIdle(), this.playTrack(track))
        }
      }),
      takeUntil(this._cancelled),
    )
  }

  private createIdleEvent() {
    return this.event.result({ player: 'idle' })
  }

  private waitForPlayerIdle() {
    return this.player.idle(this._skipTrack, this.isEndOfPlaylist.bind(this)).pipe(
      concatMapTo(this.createIdleEvent()),
      tap(() => this.incrementCurrentTrack()),
    )
  }

  private removed(track: Track) {
    return this.event.complexResult({
      item: track,
      result: { track: 'was removed, skipping' },
    }).pipe(tap(() => this.incrementCurrentTrack()))
  }

  private playTrack(track: Track) {
    const sendMsg = this.event.sendMessage(`Now playing: ${track.name}`)
    return this.player.play(track).pipe(concatMapTo(sendMsg))
  }

  private disconnectIfIdleEvent(player: ReturnType<Playlist['playerEvents']>) {
    return player.pipe(
      switchMap(res => {
        const { result } = res
        if (typeof result === 'string' || result.player !== 'idle' || !this.isEndOfPlaylist()) {
          return of(res)
        }

        return concat(of(res), this.disconnectWhenIdle())
      }),
    )
  }

  private disconnectWhenIdle() {
    return this.event.sendMessage('End of playlist, will disconnect in 5 minutes.').pipe(
      mergeMap(res => concat(
        of(res),
        this.disconnectPlaylistAfterFrames(playlistConfig.timeoutFrames),
      )),
    )
  }

  private disconnectPlaylistAfterFrames(frames: number) {
    return of(undefined).pipe(
      this.event.factory.delay(frames),
      concatMapTo(sendDisconnectMessage(this.event, 'disconnected because idle')),
    )
  }

  get currentQueue() {
    return {
      currentTrack: this._currentTrack.getValue(),
      queue: this._currentQueue.getValue(),
    }
  }

  get internalCurrentQueue() {
    return this._currentQueue
  }

  skipCurrentTrack() {
    return defer(() => {
      this._skipTrack.next()
      return of(undefined)
    })
  }

  add(event: JEvent, track: Track): Observable<Result> {
    return defer(() => {
      this._queue.next(track)
      return event.empty()
    })
  }

  get queueLength() {
    return this.currentQueue.queue.length
  }

  /**
   * Removes the track in queue with the provided index.
   */
  remove(index: number) {
    return defer(() => {
      const { queue, currentTrack } = this.currentQueue
      const maxQueueIndex = queue.length - 1

      if (index < 0) {
        throw Error(`Index cannot be less than zero, got: ${index}`)
      }

      if (index > maxQueueIndex) {
        throw Error(`Index cannot be greater than the maximum queue index, got: ${index}, and the max queue index is: ${maxQueueIndex}`)
      }

      const removedTrack = queue[index]
      removedTrack.removed = true

      if (currentTrack === index) {
        return this.skipCurrentTrack().pipe(
          mapTo(removedTrack),
        )
      }

      return of(removedTrack)
    })
  }

  disconnect() {
    this._queue.complete()
    this.player.disconnect()
    this._cancelled.next()
  }
}

const PLAYLIST_KEY = 'playlist'

export const playlistConfig = {
  timeoutFrames: 5 * 60 * 1000,
}

type PlaylistResult = { playlist: Playlist, results: Observable<Result> }

const createPlaylist = (event: JEvent): Observable<PlaylistResult> => {
  const playlist = event.factory.player.pipe(map(player => new Playlist(event, player)))

  return playlist.pipe(mergeMap(playlist => {
    const savePlaylist = event.store.object.pipe(
      mergeMap(store => store.put(PLAYLIST_KEY, playlist)),
    )

    return savePlaylist.pipe(
      mapTo({
        playlist,
        results: event.result({ playlist: 'created' }, playlist.results),
      }),
    )
  }))
}

export const getPlaylist = (event: JEvent) => {
  return event.store.object.pipe(
    mergeMap(store => store.get(PLAYLIST_KEY)),
    map(r => r as Playlist),
  )
}

export const removePlaylist = (event: JEvent) => {
  return getPlaylist(event).pipe(
    mergeMap(playlist => {
      playlist.disconnect()

      return event.store.object.pipe(mergeMap(store => store.remove(PLAYLIST_KEY)))
        .pipe(mergeMapTo(event.result({ playlist: 'disconnected' })))
    }),
  )
}

export const getOrCreatePlaylist = (event: JEvent): Observable<PlaylistResult> => {
  return getPlaylist(event).pipe(
    map(playlist => of({ playlist, results: event.result({ playlist: 'found' }) })),
    defaultIfEmpty(createPlaylist(event)),
    mergeAll(),
  )
}
