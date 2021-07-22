/* Copyright (c) 2013-2020 Richard Rodger and other contributors, MIT License */
'use strict'

let Lab = require('@hapi/lab')
Lab = null != Lab.script ? Lab : require('hapi-lab-shim')

const Code = require('@hapi/code')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const it = lab.it
const expect = Code.expect

const { Jsonic, JsonicError } = require('..')

const je = (s) => () => Jsonic(s)


describe('error', function () {
  it('error-message', () => {
    let src0 = '\n\n\n\n\n\n\n\n\n\n   "\\u0000"'
    try {
      Jsonic(src0)
    }
    catch(e) {
      expect(e.message).equal(
`\u001b[31m[jsonic/invalid_unicode]:\u001b[0m invalid unicode escape: "\\\\u0000"
  \u001b[34m-->\u001b[0m <no-file>:10:6
\u001b[34m   8 | \u001b[0m
\u001b[34m   9 | \u001b[0m
\u001b[34m  10 | \u001b[0m   "\\u0000"
             \u001b[31m^^^^^^ invalid unicode escape: "\\\\u0000"\u001b[0m
\u001b[34m  11 | \u001b[0m
\u001b[34m  12 | \u001b[0m
  The escape sequence "\\\\u0000" does not encode a valid unicode code point
  number. You may need to validate your string data manually using test
  code to see how Java script will interpret it. Also consider that your
  data may have become corrupted, or the escape sequence has not been
  generated correctly.
  \u001b[2mhttps://jsonic.richardrodger.com\u001b[0m
  \u001b[2m--internal: rule=val~open; token=#BD~foo; plugins=--\u001b[0m'
`      )
    }
  })
  

  it('plugin-errors', () => {
    let k = Jsonic.make().use(function foo(jsonic) {
      jsonic.options({
        error: {
          foo: 'foo: $src!'
        },
        hint: {
          foo: 'Foo hint.'
        }
      })
      jsonic.lex(()=>(lex)=>{
        if(lex.src.substring(lex.pnt.sI).startsWith('FOO')) {
          return lex.bad('foo', lex.pnt.sI, lex.pnt.sI + 4)
        }
      })
    })

    let src0 = 'a:1,\nb:FOO'

    /*
    try {
      k(src0)
    }
    catch(e) {
      console.log(e)
    } 
    */
    
    try {
      k(src0)
    }
    catch(e) {
      expect(e.message).equals(
        '\u001b[31m[jsonic/foo]:\u001b[0m foo: "FOO"!\n' +
          '  \u001b[34m-->\u001b[0m <no-file>:2:3\n' +
          '\u001b[34m  1 | \u001b[0ma:1,\n' +
          '\u001b[34m  2 | \u001b[0mb:FOO\n' +
          '        \u001b[31m^^^ foo: "FOO"!\u001b[0m\n' +
          '\u001b[34m  3 | \u001b[0m\n' +
          '\u001b[34m  4 | \u001b[0m\n' +
          '  Foo hint.\n' +
          '  \u001b[2mhttps://jsonic.richardrodger.com\u001b[0m\n' +
          '  \u001b[2m--internal: rule=pair~o; token=#BD~foo;'+
          ' plugins=foo--\u001b[0m\n'
      )
    }
    
    expect(()=>k('a:1,\nb:FOO'))
      .throws(JsonicError, /foo/)
  })
  

  it('lex-unicode', () => {
    let src0 = '\n\n\n\n\n\n\n\n\n\n   "\\uQQQQ"'
    //je(src0)()
    expect(je(src0))
      .throws(JsonicError, /invalid_unicode/)

    let src1 = '\n\n\n\n\n\n\n\n\n\n   "\\u{QQQQQQ}"'
    //je(src1)()
    expect(je(src0))
      .throws(JsonicError, /invalid_unicode/)
  })


  it('lex-ascii', () => {
    let src0 = '\n\n\n\n\n\n\n\n\n\n   "\\x!!"'
    // je(src0)()
    expect(je(src0))
      .throws(JsonicError, /invalid_ascii/)
  })


  it('lex-unprintable', () => {
    let src0 = '"\x00"'
    expect(je(src0))
      .throws(JsonicError, /unprintable/)
  })


  it('lex-unterminated', () => {
    let src0 = '"a'

    expect(je(src0))
      .throws(JsonicError, /unterminated/)

    /*
    try {
      Jsonic(src0)
    }
    catch(e) {
      console.log(e)
    } 
    */
  })

  
  it('parse-unexpected', () => {
    let src0 = '\n\n\n\n\n\n\n\n\n\n   }'

    expect(je(src0))
      .throws(JsonicError, /unexpected/)

    /*
    try {
      Jsonic(src0)
    }
    catch(e) {
      console.log(e)
    } 
    */
  })

  
  it('error-json-desc', () => {
    try {
      Jsonic(']')
    }
    catch(e) {
      // console.log(e)
      expect(JSON.stringify(e))
        .includes('{"code":"unexpected","details":{},'+
                  '"meta":{},"lineNumber":1,"columnNumber":1')
    } 
  })


  it('bad-syntax', () => {
    // TODO: unexpected end of src needs own case, otherwise incorrect explanation
    // expect(je('{a')).throws(JsonicError, /incomplete/)

    // TODO: should all be null
    //expect(Jsonic('a:')).equals({a:undefined})
    //expect(Jsonic('{a:')).equals({a:undefined})
    //expect(Jsonic('{a:,b:')).equals({a:undefined,b:undefined})
    //expect(Jsonic('a:,b:')).equals({a:undefined,b:undefined})

    // Invalid pair.
    expect(je('{]')).throws(JsonicError, /unexpected/)
    expect(je('[}')).throws(JsonicError, /unexpected/)
    expect(je(':')).throws(JsonicError, /unexpected/)
    expect(je(':a')).throws(JsonicError, /unexpected/)
    expect(je(' : ')).throws(JsonicError, /unexpected/)
    expect(je('{,]')).throws(JsonicError, /unexpected/)
    expect(je('[,}')).throws(JsonicError, /unexpected/)
    expect(je(',:')).throws(JsonicError, /unexpected/)
    expect(je(',:a')).throws(JsonicError, /unexpected/)
    expect(je('[:')).throws(JsonicError, /unexpected/)
    expect(je('[:a')).throws(JsonicError, /unexpected/)

    
    // Unexpected close
    expect(je(']')).throws(JsonicError, /unexpected/)
    expect(je('}')).throws(JsonicError, /unexpected/)
    expect(je(' ]')).throws(JsonicError, /unexpected/)
    expect(je(' }')).throws(JsonicError, /unexpected/)
    expect(je(',}')).throws(JsonicError, /unexpected/)
    expect(je('a]')).throws(JsonicError, /unexpected/)
    expect(je('a}')).throws(JsonicError, /unexpected/)
    expect(je('{a]')).throws(JsonicError, /unexpected/)
    expect(je('[a}')).throws(JsonicError, /unexpected/)
    expect(je('{a}')).throws(JsonicError, /unexpected/)
    expect(je('{a:1]')).throws(JsonicError, /unexpected/)

    
    // These are actually OK
    expect(Jsonic(',]')).equals([null])
    expect(Jsonic('{a:}')).equals({a:null})
    expect(Jsonic('{a:b:}')).equals({a:{b:null}})
    expect(Jsonic('[a:1]')).equals([{a:1}])
    expect(Jsonic('[a:]')).equals([{a:null}])
  })

})
