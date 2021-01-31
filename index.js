const { persistr } = require('@persistr/js')
module.exports = {
  initialize: (toolbox) => {
    toolbox.persistr = persistr
    toolbox.session = new Session(persistr, toolbox.settings)
    return { prerun: [ loggedin, loggedout ]}
  }
}

const loggedin = async (toolbox, cmd, args) => {
  const { session } = toolbox

  // Only apply this middleware to commands with specific labels.
  if (!cmd.labels || !cmd.labels.includes('logged-in')) {
    return
  }

  // If not logged in, abort the command.
  if (!session.active) {
    throw new Error(`Not logged in`)
  }

  // Add Persistr account to toolbox.
  toolbox.account = await session.resume()
}

const loggedout = async (toolbox, cmd, args) => {
  const { session } = toolbox

  // Only apply this middleware to commands with specific labels.
  if (!cmd.labels || !cmd.labels.includes('logged-out')) {
    return
  }

  // If already logged in, abort the command.
  if (session.active) {
    throw new Error(`${session.email} already logged in`)
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
