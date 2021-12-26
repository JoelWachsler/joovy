import { getOrCreateObjectStore, getOrCreateStringStore, StoreProvider } from '../../store/Store'
import { BaseConstructor } from '../JEvent'
import { EventStore } from '../EventStore'

const WithEventStore = <TBase extends BaseConstructor>(Base: TBase, storeProvider: StoreProvider) => {
  return class extends Base implements EventStore {

    get string() {
      return getOrCreateStringStore({ message: this.message, storeProvider })
    }

    get object() {
      return getOrCreateObjectStore({ message: this.message, storeProvider })
    }

    get store() {
      return this
    }
  }
}

export default WithEventStore