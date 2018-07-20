const webhooks = {
  installation: require('./installation'),
  push: require('./push')
}
webhooks.installation_repositories = webhooks.installation
module.exports = webhooks
