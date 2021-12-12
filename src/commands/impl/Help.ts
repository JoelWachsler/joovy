import { Observable } from 'rxjs'
import JEvent from '../../JEvent'
import ArgParser from '../ArgParser'
import Command from '../command'

export default class Help implements Command {
  argument = ArgParser.create('help')

  helpText = 'Print this message.'

  handleMessage(event: JEvent): Observable<JEvent> {
    throw new Error('Method not implemented.')
  }
}
