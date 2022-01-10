import { BaseConstructor } from '../JEvent'
import { EventStore } from '../EventStore'
import { StoreProvider, getOrCreateStringStore, getOrCreateObjectStore } from '../../store/impl/InMemoryStore'
import { getOrCreateStore } from '../../store/impl/LevelStore'

const WithEventStore = <TBase extends BaseConstructor>(Base: TBase, storeProvider: StoreProvider, override?: StoreOverride) => {
  return class extends Base implements EventStore {
    get string() {
      return override?.string ?? getOrCreateStringStore({ message: this.message, storeProvider })
    }

    get object() {
      return override?.object ?? getOrCreateObjectStore({ message: this.message, storeProvider })
    }

    get persistentString() {
      return override?.persistentString ?? getOrCreateStore()
    }

    get store() {
      return this
    }
  }
}

export type StoreOverride = Partial<EventStore['store']>

export default WithEventStore
