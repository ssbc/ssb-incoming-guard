var pull = require('pull-stream')

exports.name = 'incoming-guard'
exports.version = require('./package.json').version
exports.manifest = {
}

exports.init = function (ssb, config) {

  ssb.emit('log:info', ['SBOT', 'incoming guard init'])

  ssb.auth.hook(function (fn, args) {
    var pubkey = args[0], cb = args[1]

    // run normal authentication
    fn(pubkey, function (err, auth) {
      if(err||auth) return cb(err, auth)

      var serverHops = config.friends && config.friends.hops || 3
      if(ssb.friends) {
        pull(
          ssb.friends.hopStream(),
          pull.drain(s => {
            var hops = s[pubkey]
            if (hops == undefined || hops > serverHops) {
              ssb.emit('log:info', ['SBOT', 'connection outside hops, auth fail: ', hops])
              cb(null, { allow: [], deny: null })
            } else {
              ssb.emit('log:info', ['SBOT', 'connection inside hops, auth ok: ', hops, pubkey])
              cb(null, true)
            }
          })
        )
      }
    })
  })
  
  return {
  }
}
