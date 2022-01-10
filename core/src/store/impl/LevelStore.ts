import levelup from 'levelup'
import rocksdb from 'rocksdb'
import { defer, Observable, of } from 'rxjs'
import config from '../../config'
import logger from '../../logger'
import Store from '../Store'

export class LevelStore implements Store<string> {
  constructor(private store: StoreType) { }

  put(key: string, value: string): Observable<string> {
    return new Observable(subscribe => {
      this.store.put(key, value, err => {
        if (err) {
          return subscribe.error(err)
        }

        subscribe.next(value)
        subscribe.complete()
      })
    })
  }

  get(key: string): Observable<string> {
    return new Observable(subscribe => {
      this.store.get(key, (err, val) => {
        if (err) {
          // key was probably not found
        } else {
          subscribe.next(val.toString())
        }

        subscribe.complete()
      })
    })
  }

  remove(key: string): Observable<void> {
    return new Observable(subscribe => {
      this.store.del(key, err => {
        if (err) {
          return subscribe.error(err)
        }

        subscribe.next()
        subscribe.complete()
      })
    })
  }

  backup(): Observable<KeyValue> {
    return new Observable(subscribe => {
      this.store.createReadStream()
        .on('data', data => {
          logger.info(`Got data: ${data.key}=${data.value}`)
          subscribe.next(data)
        })
        .on('end', () => subscribe.complete())
    })
  }
} 

interface KeyValue {
  key: Uint8Array
  value: Uint8Array
}

const createStore = () => {
  return levelup(rocksdb(config().dbLocation))
}

export const getOrCreateStore = (): Observable<LevelStore> => {
  return defer(() => {
    if (!store) {
      store = createStore()
    }

    return of(new LevelStore(store))
  })
}

type StoreType = ReturnType<typeof createStore>

let store: StoreType
