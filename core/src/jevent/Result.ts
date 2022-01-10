import { Observable } from 'rxjs'
import JEvent from './JEvent'

/**
 * An easy way to notify the caller that something has happened.
 * This is especially useful when you want to determine if
 * something has happened in a test without resolving to mocking.
 */
export interface Result<T = any> {
  item: T
  result: ResultResult
  event: JEvent
}

export class EmptyResult implements Result {
  constructor(public event: JEvent) {}

  item: any
  result: ResultResult = ''
}

export type ResultResult = string | Record<string, unknown>

export type ResultArg<T = undefined> = { result: ResultResult, item: T }

export interface ResultFactory {
  result(resultToAdd: ResultResult, ...andThen: Observable<Result>[]): Observable<Result>
  complexResult<T = undefined>(arg: ResultArg<T>, ...andThen: Observable<Result>[]): Observable<Result<T>>
  empty(): Observable<EmptyResult>
}
