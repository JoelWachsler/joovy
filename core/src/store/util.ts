import { defer } from 'rxjs'
import JEvent from '../jevent/JEvent'

const messageStore = new Map<string, Map<string, unknown>>()

export const getOrCreateObjectStore = (id: string) => {
  let store = messageStore.get(id)
  if (!store) {
    store = new Map()
    messageStore.set(id, store)
  }

  return store
}

export const removeObjectStore = (event: JEvent) => {
  return defer(() => {
    const channelId = event.message.channelId
    messageStore.delete(channelId)

    return event.result({ store: { event: 'removed', id: channelId } })
  })
}
