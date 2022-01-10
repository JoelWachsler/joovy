import { defer, Observable, of, SchedulerLike, timeout } from 'rxjs'
import Player from '../player/Player'
import Track from '../player/Track'

export class PlayerFake implements Player {
  constructor(private scheduler: SchedulerLike) { }

  idle(cancel: Observable<void>): Observable<void> {
    return new Observable(subscribe => {
      const cancelTimeout = timeout({
        each: 5,
        scheduler: this.scheduler,
        with: () => of(undefined),
      })

      cancel.pipe(cancelTimeout).subscribe(() => {
        subscribe.next()
        subscribe.complete()
      })
    })
  }

  play(track: Track): Observable<Track> {
    return defer(() => of(track))
  }

  disconnect(): void {
    return undefined
  }
}
