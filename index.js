const { persistr } = require('@persistr/js')
module.exports = {
  initialize: (toolbox) => {
    toolbox.persistr = persistr
  }
}
