import { defer, EMPTY, Observable, of } from 'rxjs'
import JMessage from '../../JMessage'
import Store, { ObjectStore, StringStore } from '../Store'

class InMemoryStore<T> implements Store<T> {
  private storage = new Map<string, T>()

  put(key: string, value: T) {
    return defer(() => {
      this.storage.set(key, value)
      return of(value)
    })
  }

  get(key: string) {
    return defer(() => {
      const res = this.storage.get(key)
      return res
        ? of(res)
        : EMPTY
    })
  }

  remove(key: string) {
    return defer(() => {
      this.storage.delete(key)
      return of(undefined)
    })
  }
}

export type GetStoreArgs = { message: JMessage, storeProvider: StoreProvider }

export const getOrCreateInMemoryStore = (args: GetStoreArgs): Store<any> => {
  const { message, storeProvider } = { ...args, storeProvider: args.storeProvider }
  const store = storeProvider()

  if (!store.has(message.channelId)) {
    store.set(message.channelId, new InMemoryStore())
  }

  return store.get(message.channelId) ?? throwError('Store is not defined!')
}

const throwError = (err: string) => {
  throw Error(err)
}

export type StoreProvider = () => Map<string, any>

export const getOrCreateStringStore = (args: GetStoreArgs): Observable<StringStore> => {
  return of(getOrCreateInMemoryStore(args))
}

export const getOrCreateObjectStore = (args: GetStoreArgs): Observable<ObjectStore> => {
  return of(getOrCreateInMemoryStore(args))
}
