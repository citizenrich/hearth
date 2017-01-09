'use strict'
const env = require('./test-env/init')()
const server = require('../lib/server')
const tap = require('tap')
const request = require('request')
const _ = require('lodash')

let basicPractitionerTest = (t, test) => {
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)

      let practitioner = _.cloneDeep(require('./resources/Practitioner-1.json'))
      delete practitioner.id

      let c = db.collection('Practitioner')
      c.insert({ latest: practitioner }, (err) => {
        t.error(err)

        // insert a second practitioner that should be filtered in searches
        practitioner.identifier[0].value = 'FILTER-ME'
        practitioner.name.given[0] = 'FILTER-ME'
        practitioner.name.family[0] = 'FILTER-ME'
        practitioner.practitionerRole[0].role.coding[0].code = 'FILTER-ME'

        c.insert({ latest: practitioner }, (err) => {
          t.error(err)

          test(() => {
            env.clearDB((err) => {
              t.error(err)
              server.stop(() => {
                t.end()
              })
            })
          })
        })
      })
    })
  })
}

tap.test('practitioner should support searches on identifier', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?identifier=1007211153444',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(body.entry[0].resource.identifier[0].value, '1007211153444', 'body should contain the matching practitioner')
      done()
    })
  })
})

tap.test('practitioner should support searches on identifier with a system specified', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?identifier=pshr:sanid|1007211153444',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(body.entry[0].resource.identifier[0].value, '1007211153444', 'body should contain the matching practitioner')
      done()
    })
  })
})

tap.test('practitioner should respond with en empty searchset if no matches', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?identifier=NOTTHERE',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 0, 'body should contain zero results')
      done()
    })
  })
})

tap.test('practitioner should support basic given name searches', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?given=Alison',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(body.entry[0].resource.identifier[0].value, '1007211153444', 'body should contain the matching practitioner')
      done()
    })
  })
})

tap.test('practitioner should support basic family name searches', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?family=Tobi',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(body.entry[0].resource.identifier[0].value, '1007211153444', 'body should contain the matching practitioner')
      done()
    })
  })
})

tap.test('name searches should be case-insensitive', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?given=alison',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(body.entry[0].resource.identifier[0].value, '1007211153444', 'body should contain the matching practitioner')
      done()
    })
  })
})

tap.test('name searches should match the first part of the string', (t) => {
  basicPractitionerTest(t, (done) => {
    // search for 'ali' should match 'Alison'
    request({
      url: 'http://localhost:3447/fhir/Practitioner?given=ali',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(body.entry[0].resource.identifier[0].value, '1007211153444', 'body should contain the matching practitioner')
      done()
    })
  })
})

tap.test('should search on both given and family name', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?given=alison&family=tobi',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(body.entry[0].resource.identifier[0].value, '1007211153444', 'body should contain the matching practitioner')

      // shouldn't match alison - family name 'doe'
      request({
        url: 'http://localhost:3447/fhir/Practitioner?given=alison&family=doe',
        headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
        json: true
      }, (err, res, body) => {
        t.error(err)

        t.equal(res.statusCode, 200, 'response status code should be 200')
        t.ok(body)
        t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
        t.equal(body.total, 0, 'body should contain zero results')
        done()
      })
    })
  })
})

tap.test('should search on identifier and name', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?identifier=1007211153444&given=alison',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(body.entry[0].resource.identifier[0].value, '1007211153444', 'body should contain the matching practitioner')

      // shouldn't match alison - search on different name
      request({
        url: 'http://localhost:3447/fhir/Practitioner?identifier=1007211153444&given=jane',
        headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
        json: true
      }, (err, res, body) => {
        t.error(err)

        t.equal(res.statusCode, 200, 'response status code should be 200')
        t.ok(body)
        t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
        t.equal(body.total, 0, 'body should contain zero results')
        done()
      })
    })
  })
})

tap.test('should respond with bad request OperationOutcome if unsupported query parameter used', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?address=notsupported',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 400, 'response status code should be 400')
      t.ok(body)
      t.equal(body.resourceType, 'OperationOutcome', 'result should be an OperationOutcome')
      t.equal(body.issue[0].severity, 'error', 'outcome severity should be \'error\'')
      done()
    })
  })
})

tap.test('practitioner should be saved correctly', (t) => {
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)

      let prac = _.cloneDeep(require('./resources/Practitioner-1.json'))
      delete prac.id

      request.post({
        url: 'http://localhost:3447/fhir/Practitioner',
        headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
        body: prac,
        json: true
      }, (err, res, body) => {
        t.error(err)
        t.equal(res.statusCode, 201, 'response status code should be 201')

        t.ok(res.headers['location'], 'should have a location header set')
        t.match(res.headers['location'], /\/fhir\/Practitioner\/[\da-f]+\/_history\/1/, 'should return a location with both id and vid present')

        let c = db.collection('Practitioner')
        c.findOne((err, result) => {
          t.error(err)
          t.ok(result, 'result should exist in the mongo')
          t.ok(result.latest, 'result should have a latest property')

          let prac = result.latest

          t.equal(prac.identifier[0].value, '1007211153444', 'should have correct identifier')
          t.equal(prac.identifier[1].value, '1001113555553', 'should have correct identifier')

          t.ok(prac.meta, 'should have meta set')
          t.ok(prac.meta.versionId, 'should have meta.versionId set')
          t.ok(prac.meta.lastUpdated, 'should have meta.lastUpdated set')

          env.clearDB((err) => {
            t.error(err)
            server.stop(() => {
              t.end()
            })
          })
        })
      })
    })
  })
})

tap.test('practitioner endpoint should return an error', (t) => {
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)

      let prac = _.cloneDeep(require('./resources/Practitioner-1.json'))

      request.post({
        url: 'http://localhost:3447/fhir/Practitioner',
        headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
        body: prac,
        json: true
      }, (err, res, body) => {
        t.error(err)
        t.equal(res.statusCode, 400, 'response status code should be 400')
        t.equal(body.resourceType, 'OperationOutcome', 'should return an operation outcome object')

        env.clearDB((err) => {
          t.error(err)
          server.stop(() => {
            t.end()
          })
        })
      })
    })
  })
})

tap.test('practitioner should support searches on role', (t) => {
  basicPractitionerTest(t, (done) => {
    request({
      url: 'http://localhost:3447/fhir/Practitioner?role=anaesthetist',
      headers: env.getTestAuthHeaders(env.users.sysadminUser.email),
      json: true
    }, (err, res, body) => {
      t.error(err)

      t.equal(res.statusCode, 200, 'response status code should be 200')
      t.ok(body)
      t.equal(body.resourceType, 'Bundle', 'result should be a bundle')
      t.equal(body.total, 1, 'body should contain one result')
      t.equal(body.entry[0].resource.identifier[0].value, '1007211153444', 'body should contain the matching practitioner')
      done()
    })
  })
})