const Webhooks = require('./lib/webhooks');

module.exports = (robot) => {
  robot.log('Yay, the app was loaded!');

  robot.utils = require('./lib/utils');

  Object.keys(Webhooks)
    .forEach(evt => {
      robot.log('Loading event : ' + evt);
      robot.on(evt, Webhooks[evt].call(this, robot))
    });
}
