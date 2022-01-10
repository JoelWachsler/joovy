import JMessage from '../../JMessage'
import { StoreProvider } from '../../store/impl/InMemoryStore'
import { Base } from '../JEvent'
import WithEventStore, { StoreOverride } from './EventStore'
import WithResult from './Result'

export const WithBaseFunctionality = <T extends JMessage = JMessage>(message: T, storeProvider: StoreProvider, timestamp: number, storeOverride?: StoreOverride) => {
  return WithResult(WithEventStore(Base(message, timestamp), storeProvider, storeOverride))
}