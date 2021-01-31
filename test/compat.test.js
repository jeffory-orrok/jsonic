/* Copyright (c) 2013-2020 Richard Rodger and other contributors, MIT License */
'use strict'

let Lab = require('@hapi/lab')
Lab = null != Lab.script ? Lab : require('hapi-lab-shim')

const Code = require('@hapi/code')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const it = lab.it
const expect = Code.expect

const { Jsonic } = require('..')
const { HJson } = require('../plugin/hjson')


function testlog(...rest) {
  console.log(rest.filter(x=>'object'!=typeof(x)))
}

describe('compat', function () {

  // https://hjson.github.io/
  it('hjson-readme', () => {
    let j = Jsonic.make().use(HJson)
    

    expect(j(`{
  first: 1
  second: 2
}`)).equals({first: 1,second: 2})

    expect(j(`{
  # hash style comments
  # (because it's just one character)

  // line style comments
  // (because it's like C/JavaScript/...)

  /* block style comments because
     it allows you to comment out a block * /

  # Everything you do in comments,
  # stays in comments ;-}
}`)).equals({})


    expect(j(`{
  # specify rate in requests/second
  rate: 1000
}`)).equals({rate: 1000})



    expect(j(`{
  JSON: "a string"

  Hjson: a string

  # notice, no escape necessary:
  RegEx: \\s+
}`)).equals({JSON: 'a string', Hjson: 'a string', RegEx: '\\s+'})


   expect(j(`{
  one: 1
  two: 2,
  more: [3,4,5]
  trailing: 6,
}`)).equals({
  one: 1,
  two: 2,
  more: [3,4,5],
  trailing: 6
})

    
   expect(j(`{
  md:
    '''
    First line.
    Second line.
      This line is indented by two spaces.
    '''
}`)).equals({
  md: "First line.\nSecond line.\n  This line is indented by two spaces.",
})

    
    expect(j(`{
  "key name": "{ sample }"
  "{}": " spaces at the start/end "
  this: is OK though: {}[],:
}`)).equals({
  "key name": "{ sample }",
  "{}": " spaces at the start/end ",
  "this": "is OK though: {}[],:",
})

    
  })
})