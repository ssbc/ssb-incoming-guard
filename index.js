var pull = require('pull-stream')

exports.name = 'incoming-guard'
exports.version = require('./package.json').version
exports.manifest = {
}

exports.init = function (ssb, config) {

  ssb.emit('log:info', ['SBOT', 'incoming guard init'])

  if (!ssb.friends || !ssb.friends.hopStream) {
    ssb.emit('log:error', ['SBOT', 'missing sbot.friends.hopStream'])
    return
  }

  var cbs = []
  var dists = {}
  function gotHops(data) {
    for(var k in data) {
      dists[k] = data[k]
    }
  }
  pull(
    ssb.friends.hopStream({live: false, old: true}),
    pull.drain(gotHops, function (err) {
      if (err) return console.trace(err)
      while (cbs.length) cbs.shift()()
      cbs = null
    })
  )
  pull(
    ssb.friends.hopStream({live: true, old: false}),
    pull.drain(gotHops)
  )
  function onReady(fn) {
    if (cbs) cbs.push(fn)
    else fn()
  }

  ssb.auth.hook(function (fn, args) {
    var pubkey = args[0], cb = args[1]

    // run normal authentication
    fn(pubkey, function (err, auth) {
      if(err||auth) return cb(err, auth)

      onReady(function () {
        var serverHops = config.friends && config.friends.hops || 3
        var hops = dists[pubkey]
        if (hops == null || hops > serverHops) {
          ssb.emit('log:info', ['SBOT', 'connection outside hops, auth fail: ', hops])
          cb(new Error('connection outside hops: ' + pubkey + ' hops: ' + hops))
        } else {
          ssb.emit('log:info', ['SBOT', 'connection inside hops, auth ok: ', hops, pubkey])
          cb(null, false)
        }
      })
    })
  })
  
  return {
  }
}
