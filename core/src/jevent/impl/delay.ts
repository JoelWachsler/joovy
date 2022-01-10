import { delay } from 'rxjs'

export const delayFactoryImpl = <T>(ms: number) => delay<T>(ms)
