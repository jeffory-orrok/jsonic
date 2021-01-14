/* Copyright (c) 2013-2020 Richard Rodger, MIT License */

// TODO: use prev code

import Fs from 'fs'
import Path from 'path'
import { Jsonic, Plugin, util } from '../jsonic'
import { Json } from './json'
import { Csv } from './csv'

let DEFAULTS = {
  char: '@',
  basepath: '.',
}

let Multifile: Plugin = function multifile(jsonic: Jsonic) {
  let popts = util.deep({}, DEFAULTS, jsonic.options.plugin.multifile)
  let atchar = popts.char

  jsonic.options({
    singles: jsonic.options.singles + atchar
  })

  let json = Jsonic.use(Json, jsonic.options.plugin.json || {})
  let csv = Jsonic.use(Csv, jsonic.options.plugin.csv || {})

  let ST = jsonic.options.ST
  let TX = jsonic.options.TX
  let AT = jsonic.options.TOKENS[atchar]

  jsonic.rule('val', (rs: any) => {
    rs.def.open.push(
      { s: [AT, ST] },
      { s: [AT, TX] }
    )

    let bc = rs.def.before_close
    rs.def.before_close = (rule: any, ctx: any) => {
      if (rule.open[0]) {
        if (AT === rule.open[0].pin) {
          // TODO: text TX=foo/bar as @"foo/bar" works but @foo/bar does not!
          let filepath = rule.open[1].val
          let fullpath = Path.resolve(ctx.meta.basepath || popts.basepath, filepath)
          let filedesc = Path.parse(fullpath)
          let basepath = filedesc.dir
          let file_ext = filedesc.ext.toLowerCase()

          // console.log('FILE', filepath, fullpath, basepath)

          let val

          if ('.js' === file_ext) {
            val = require(fullpath)
            if ('function' === typeof val) {
              val = val()
            }
          }

          // Manually load file contents
          else {
            let content = Fs.readFileSync(fullpath).toString()
            if ('.json' === file_ext) {
              val = json(content, { mode: 'json', fileName: fullpath })
            }
            else if ('.jsonic' === file_ext) {
              val = jsonic(content, { basepath: basepath, fileName: fullpath })
              // TODO: test make preserves plugins
              //.make({ plugin: { multifile: { basepath: basepath } } })
              //.parse(content)
            }
            if ('.csv' === file_ext) {
              val = csv(content)
            }
          }

          rule.open[0].val = val
        }
      }
      return bc(rule)
    }

    return rs
  })

}

export { Multifile }
