export default class ArgParser {
  private constructor(public command: string, private args: string[]) { }

  is(potentialCmd: string) {
    return potentialCmd.startsWith(`${this.command} `) || potentialCmd === this.command
  }

  get help() {
    return `${this.command} ${this.args.join(' ')}`
  }

  withArg(arg: string, builder?: (arg: Builder) => Builder) {
    let argBuilder = Builder.create(arg)
    if (builder) {
      argBuilder = builder(argBuilder)
    }
    this.args.push(argBuilder.build())
    return this
  }

  withOptionalArg(arg: string, builder?: (arg: Builder) => Builder) {
    let argBuilder = Builder.create(arg)
    if (builder) {
      argBuilder = builder(argBuilder)
    }
    this.args.push(`[${argBuilder.build}]`)
    return this
  }

  static create(command: string) {
    return new ArgParser(`/${command}`, [])
  }
}

class Builder {
  private constructor(private args: string[]) { }

  or(arg: string) {
    this.args.push(arg)
    return this
  }

  build() {
    return this.args.join(' | ')
  }

  static create(arg: string) {
    return new Builder([arg])
  }
}
