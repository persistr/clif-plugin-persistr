const { persistr } = require('@persistr/js')
module.exports = {
  initialize: (toolbox) => {
    toolbox.persistr = persistr
    toolbox.session = new Session(persistr, toolbox.settings)
  }
}

class Session {
  constructor(persistr, settings) {
    this.persistr = persistr
    this.settings = settings
  }

  get server() {
    return this.settings.server ?? 'Persistr Cloud'
  }

  get session() {
    return this.settings.sessions?.[this.server] ?? {}
  }

  set session(session) {
    if (!this.settings.sessions) this.settings.sessions = {}
    this.settings.sessions[this.server] = session
  }

  async begin(credentials) {
    const account = await this.persistr.connect({
      server: this.settings.server,
      credentials,
      authorization: () => this.session.authorization,
      authorized: authorization => this.session = { email: credentials.email, authorization }
    })
    const details = await account.details()
    return account
  }

  async resume() {
    const account = await this.persistr.connect({
      server: this.settings.server,
      authorization: () => this.session.authorization,
      authorized: authorization => this.session.authorization = authorization
    })
    return account
  }

  async end() {
    const session = this.session
    delete this.settings.sessions[this.server]
    return session.email
  }

  get active() {
    return (this.session.email && this.session.authorization)
  }

  get email() {
    return this.session.email
  }
}
