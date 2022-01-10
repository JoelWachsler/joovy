import { Observable } from 'rxjs'
import { ObjectStore, StringStore } from '../store/Store'

export interface EventStore {
  readonly store: {
    readonly string: Observable<StringStore>
    readonly object: Observable<ObjectStore>
    readonly persistentString: Observable<StringStore>
  }
}
