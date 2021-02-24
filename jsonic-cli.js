"use strict";
/* Copyright (c) 2020-2021 Richard Rodger, Oliver Sturm, and other contributors, MIT License */
/* $lab:coverage:off$ */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const fs_1 = __importDefault(require("fs"));
const jsonic_1 = require("./jsonic");
// Make sure JsonicError is shown nicely.
if (require.main === module) {
    run(process.argv, console).catch((e) => console.error(e));
}
/* $lab:coverage:on$ */
async function run(argv, console) {
    const args = {
        help: false,
        stdin: false,
        sources: [],
        files: [],
        options: [],
        meta: [],
        plugins: [],
    };
    let accept_args = true;
    for (let aI = 2; aI < argv.length; aI++) {
        let arg = argv[aI];
        if (accept_args && arg.startsWith('-')) {
            if ('-' === arg) {
                args.stdin = true;
            }
            else if ('--' === arg) {
                accept_args = false;
            }
            else if ('--file' === arg || '-f' === arg) {
                args.files.push(argv[++aI]);
            }
            else if ('--option' === arg || '-o' === arg) {
                args.options.push(argv[++aI]);
            }
            else if ('--meta' === arg || '-m' === arg) {
                args.meta.push(argv[++aI]);
            }
            else if ('--debug' === arg || '-d' === arg) {
                args.meta.push('log=-1');
            }
            else if ('--help' === arg || '-h' === arg) {
                args.help = true;
            }
            else if ('--plugin' === arg || '-p' === arg) {
                args.plugins.push(argv[++aI]);
            }
        }
        else {
            args.sources.push(arg);
        }
    }
    if (args.help) {
        return help(console);
    }
    let options = handle_props(args.options);
    let meta = handle_props(args.meta);
    let plugins = handle_plugins(args.plugins);
    options.debug = options.debug || {};
    options.debug.get_console = () => console;
    let jsonic = jsonic_1.Jsonic.make(options);
    for (let pn in plugins) {
        jsonic.use(plugins[pn]);
    }
    let data = { val: null };
    for (let fp of args.files) {
        if ('string' === typeof (fp) && '' !== fp) {
            jsonic_1.util.deep(data, { val: jsonic(fs_1.default.readFileSync(fp).toString(), meta) });
        }
    }
    if (0 === args.sources.length || args.stdin) {
        let stdin = await read_stdin(console);
        jsonic_1.util.deep(data, { val: jsonic(stdin, meta) });
    }
    for (let src of args.sources) {
        jsonic_1.util.deep(data, { val: jsonic(src, meta) });
    }
    options.JSON =
        null == options.JSON || 'object' !== typeof (options.JSON) ? {} :
            options.JSON;
    let replacer = jsonic_1.Jsonic(options.JSON.replacer);
    let space = jsonic_1.Jsonic(options.JSON.space);
    replacer = Array.isArray(replacer) ? replacer :
        null == replacer ? null :
            [replacer];
    let json = JSON.stringify(data.val, replacer, space);
    console.log(json);
}
exports.run = run;
async function read_stdin(console) {
    if ('string' === typeof (console.test$)) {
        return console.test$;
    }
    /* $lab:coverage:off$ */
    if (process.stdin.isTTY)
        return '';
    let s = '';
    process.stdin.setEncoding('utf8');
    for await (const p of process.stdin)
        s += p;
    return s;
    /* $lab:coverage:on$ */
}
// NOTE: uses vanilla Jsonic to parse arg vals, so you can set complex properties.
function handle_props(propvals) {
    let out = {};
    for (let propval of propvals) {
        let pv = propval.split(/=/);
        if ('' !== pv[0] && '' !== pv[1]) {
            let val = jsonic_1.Jsonic(pv[1]);
            set_prop(out, pv[0], val);
        }
    }
    return out;
}
function handle_plugins(plugins) {
    let out = {};
    for (let name of plugins) {
        try {
            out[name] = require(name);
        }
        catch (e) {
            let err = e;
            // Might be builtin
            try {
                out[name] = require('./plugin/' + name);
            }
            catch (e) {
                throw err; // NOTE: throws original error
            }
        }
        if ('function' !== typeof (out[name])) {
            let refname = name.match(/([^.\\\/]+)($|\.[^.]+$)/)[1];
            if ('function' == typeof (out[name][refname])) {
                out[name] = out[name][refname];
            }
            else if ('function' == typeof (out[name].default)) {
                out[name] = out[name].default;
            }
            else if ('function' ==
                typeof (out[name][camel(refname)])) {
                out[name] = out[name][camel(refname)];
            }
            else {
                throw new Error('Plugin is not a function: ' + name);
            }
        }
    }
    return out;
}
function set_prop(obj, path, val) {
    let parts = path.split('.');
    let pn;
    for (let pI = 0; pI < parts.length; pI++) {
        pn = parts[pI];
        if (pI < parts.length - 1) {
            obj = (obj[pn] = (obj[pn] || {}));
        }
    }
    obj[pn] = val;
}
function camel(s) {
    return s[0].toUpperCase() +
        s.substring(1).replace(/-(\w)/g, (m) => (m[1][0].toUpperCase() + m[1].substring(1)));
}
function help(console) {
    let s = `
A JSON parser that isn't strict.

Usage: jsonic <args> [<source-text>]*

where 
  <source-text> is the source text to be parsed into JSON.
    If omitted, the source text is read from STDIN. If multiple source texts
    are provided, they will be merged in precedence (from highest) 
    right to left, STDIN, <file>.

  <args> are the command arguments:

    -                      Alias for STDIN.

    --file <file>          Load and parse <file>.
    -f <file>

    --option <name=value>  Set option <name> to <value>, where <name> 
    -o <name=value>          can be a dotted path (see example below).

    --meta <meta=value>    Set parse meta data <name> to <value>, where <name> 
    -m <meta=value>          can be a dotted path (see option example).

    --plugin <require>     Load a plugin, where <require> is the plugin module
    -p <require>             reference (name or path).

    --debug                Print abbreviated lex and parse logs for debugging,
    -d                       alias of \`--meta log = -1\`.

    --help                 Print this help message.
    -h

Output:
  Output is generated by the built-in JSON.stringify method. The \`replacer\`
    and \`space\` arguments can be specified using \`-o JSON.replacer=...\` and
    \`-o JSON.space=...\` respectively.


Plugins 
  The built-in plugins (found in the ./plugin folder of the distribution) can be 
  specified using the abbreviated references:
    native, dynamic, csv, hsjon, multifile, legacy-stringify

  Plugin options can be specified using: \`-o plugin.<require>.<name>=<value>\`.
  See the example below.


Examples:

> jsonic a:1
{"a":1} 

> jsonic a:b:1 a:c:2
{"a":{"b":1,"c":2}}

> jsonic a:b:1 a:c:2 --option JSON.space=2
{
  "a": {
    "b": 1,
    "c": 2
  }
}

> echo a:1 | jsonic
{"a":1} 

> jsonic -o plugin.dynamic.markchar=% -p dynamic 'a:%1+1'
{"a":2}

See also: http://jsonic.richardrodger.com
`;
    console.log(s);
}
//# sourceMappingURL=jsonic-cli.js.map