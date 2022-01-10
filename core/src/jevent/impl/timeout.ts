import { ObservableInput, timeout } from 'rxjs'
import { TimeoutConfig, TimeoutInfo } from 'rxjs/internal/operators/timeout'

export const timeoutFactoryImpl =
  <T, O extends ObservableInput<any>, M>(
    config: TimeoutConfig<T, O, M> & { with: (info: TimeoutInfo<T, M>) => O },
  ) => timeout<T, O, M>(config)
