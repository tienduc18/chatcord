const moment = require('moment');

function formatMessage(username, text) {
  return {
    username,
    text,
    time: moment().format('h:mm a')
  };
}
function formatMessageTime(username, text, time) {
  return {
    username,
    text,
    time
  };
}
module.exports = {
  formatMessageTime,
  formatMessage
}
