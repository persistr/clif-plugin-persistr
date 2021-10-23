const { persistr } = require('@persistr/js')
module.exports = {
  initialize: (toolbox) => {
    return {
      toolbox: {
        persistr,
        session: new Session(persistr, toolbox.settings)
      },
      prerun: [ loggedin, loggedout ]
    }
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

  // Add Persistr connection to toolbox.
  toolbox.connection = await session.resume()
}

const loggedout = async (toolbox, cmd, args) => {
  const { session } = toolbox

  // Only apply this middleware to commands with specific labels.
  if (!cmd.labels || !cmd.labels.includes('logged-out')) {
    return
  }

  // If already logged in, abort the command.
  if (session.active) {
    throw new Error(`${session.username} already logged in`)
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
    const connection = await this.persistr.connect({
      server: this.settings.server,
      credentials,
      authorization: () => this.session.authorization,
      authorized: authorization => this.session = { username: credentials.username, authorization }
    })
    const profile = await connection.account().profile()
    return connection
  }

  async resume() {
    const connection = await this.persistr.connect({
      server: this.settings.server,
      authorization: () => this.session.authorization,
      authorized: authorization => this.session.authorization = authorization
    })
    return connection
  }

  async end() {
    const session = this.session
    delete this.settings.sessions[this.server]
    return session.username
  }

  get active() {
    return (this.session.username && this.session.authorization)
  }

  get username() {
    return this.session.username
  }
}
