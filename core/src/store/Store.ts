import { Observable } from 'rxjs'

export default interface Store<T> {
  put(key: string, value: T): Observable<T>
  get(key: string): Observable<T>
  remove(key: string): Observable<void>
}

export type StringStore = Store<string>

export type ObjectStore = Store<any>
