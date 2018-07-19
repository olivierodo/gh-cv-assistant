beforeEach(() => {
  jest.resetModules()
})

describe('# Utils - module', () => {
  test('Should match the properties', () => {
    const utils = require('./utils')
    expect(Object.keys(utils).length).toEqual(3)
    expect(utils).toHaveProperty('issues')
    expect(utils).toHaveProperty('release')
    expect(utils).toHaveProperty('notify')
  })
})

describe('# Utils - Issues - create', () => {
  test('Should create a new issue', () => {
    const github = {
      issues: {
        create: jest.fn(() => {})
      }
    }
    jest.mock('fs', () => {
      return {
        readFileSync: () => {}
      }
    })
    jest.mock('js-yaml', () => {
      return {
        safeLoad: jest.fn(() => ({title: 'myTmplTitle', body: 'myTmplBody'}))
      }
    })
    const utils = require('./utils')
    utils.notify = jest.fn()
    utils.issues.create(github, 'myTmpl', 'myUser', ['owner/repo'])
    const expectedConfig = {
      owner: 'owner',
      repo: 'repo',
      title: 'myTmplTitle',
      body: 'myTmplBody',
      assignees: ['myUser']
    }
    expectedConfig.body += '\n\n If you face any remaining issue please [create an issue to the gh-cv-assistant repository](https://github.com/olivierodo/gh-cv-assistant/issues/new)'

    expect(github.issues.create).toHaveBeenCalledTimes(1)
    expect(github.issues.create.mock.calls[0][0]).toEqual(expectedConfig)
    expect(utils.notify).toHaveBeenCalledTimes(1)
    expect(utils.notify.mock.calls[0][0]).toEqual('Create an issue - myTmpl - owner/repo')
  })

  test('Should create a new issue and update the template with dynamic values', () => {
    const github = {
      issues: {
        create: jest.fn(() => {})
      }
    }
    jest.mock('fs', () => {
      return {
        readFileSync: () => {}
      }
    })
    jest.mock('js-yaml', () => {
      return {
        safeLoad: jest.fn(() => ({title: 'myTmplTitle {{foo}}', body: 'myTmplBody {{foo}} {{bar}}'}))
      }
    })
    const utils = require('./utils')
    utils.notify = jest.fn()
    utils.issues.create(github, 'myTmpl', 'myUser', ['owner/repo'], {foo: 'foo_replace', bar: 'bar_replace'})
    const expectedConfig = {
      owner: 'owner',
      repo: 'repo',
      title: 'myTmplTitle foo_replace',
      body: 'myTmplBody foo_replace bar_replace',
      assignees: ['myUser']
    }
    expectedConfig.body += '\n\n If you face any remaining issue please [create an issue to the gh-cv-assistant repository](https://github.com/olivierodo/gh-cv-assistant/issues/new)'

    expect(github.issues.create).toHaveBeenCalledTimes(1)
    expect(github.issues.create.mock.calls[0][0]).toEqual(expectedConfig)
  })
})

describe('# Utils - Release - create', () => {
  test('Should throw an error if we can\'t create the  new tag/release', async done => {
    const github = {
      repos: {
        createRelease: jest.fn().mockRejectedValue(new Error('my detail error'))
      }
    }

    jest.mock('moment', () => () => ({format: () => '180130.12.34'}))
    const utils = require('./utils')

    try {
      await utils.release.create(
        github,
        'owner',
        'owner/repo',
        [{file: 'resume-1.tex', data: 'chunk'}]
      )
      done('should throw an error')
    } catch (err) {
      expect(err.label).toEqual('Impossible to create the release 180130.12.34')
      expect(err.message).toEqual('my detail error')

      const expectedConfig = {
        owner: 'owner',
        repo: 'repo',
        tag_name: '180130.12.34',
        name: 'v180130.12.34',
        body: '180130.12.34'
      }
      expect(github.repos.createRelease).toHaveBeenCalledTimes(1)
      expect(github.repos.createRelease.mock.calls[0][0]).toEqual(expectedConfig)
      done()
    }
  })

  test('Should try to create  a tag called latest because it doesnt\'t exist but failed', async done => {
    const _404Error = new Error()
    _404Error.name = 'HttpError'
    _404Error.code = 404
    const github = {
      repos: {
        createRelease: jest.fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('my detail error')),
        getReleaseByTag: jest.fn().mockRejectedValue(_404Error)
      }
    }

    jest.mock('moment', () => () => ({format: () => '180130.12.34'}))
    const utils = require('./utils')

    try {
      await utils.release.create(
        github,
        'owner',
        'owner/repo',
        [{file: 'resume-1.tex', data: 'chunk'}]
      )
      done('should throw an error because mock are missing')
    } catch (err) {
      const expectedConfigGet = {
        owner: 'owner',
        repo: 'repo',
        tag: 'latest'
      }

      expect(github.repos.getReleaseByTag).toHaveBeenCalledTimes(1)
      expect(github.repos.getReleaseByTag.mock.calls[0][0]).toEqual(expectedConfigGet)

      const expectedConfig = {
        owner: 'owner',
        repo: 'repo',
        tag_name: 'latest',
        name: 'Latest version',
        body: 'Release that keeps the last version up to date as an asset.'
      }

      expect(err.label).toEqual('Impossible to create the release latest')
      expect(err.message).toEqual('my detail error')
      expect(github.repos.createRelease).toHaveBeenCalledTimes(2)
      expect(github.repos.createRelease.mock.calls[1][0]).toEqual(expectedConfig)
      done()
    }
  })

  test('Should throw an error if the deletion of the assets from the latest tag', async done => {
    const release = {
    }

    const latest = {
      assets: [{
        id: 76543
      }, {
        id: 12345
      }]
    }

    const github = {
      repos: {
        createRelease: jest.fn().mockResolvedValue({data: release}),
        getReleaseByTag: jest.fn().mockResolvedValue({data: latest}),
        deleteAsset: jest.fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('my detail error'))
      }
    }

    jest.mock('moment', () => () => ({format: () => '180130.12.34'}))
    const utils = require('./utils')

    try {
      await utils.release.create(
        github,
        'owner',
        'owner/repo',
        [{file: 'resume-1.tex', data: 'chunk'}]
      )
      done('Should throw an error because mock are missing')
    } catch (err) {
      const expectedConfig1 = {
        owner: 'owner',
        repo: 'repo',
        id: 76543
      }

      const expectedConfig2 = {
        owner: 'owner',
        repo: 'repo',
        id: 12345
      }

      expect(github.repos.deleteAsset).toHaveBeenCalledTimes(2)
      expect(github.repos.deleteAsset.mock.calls[0][0]).toEqual(expectedConfig1)
      expect(github.repos.deleteAsset.mock.calls[1][0]).toEqual(expectedConfig2)

      expect(err.label).toEqual('Impossible to delete the asset on the latest tag')
      expect(err.errors).toEqual([new Error('my detail error')])
      done()
    }
  })

  test('Should upload the asset the "latest" release and to the release we just created', async done => {
    const release = {
      upload_url: 'http://upload.example.github.io/release/1'
    }

    const latest = {
      upload_url: 'http://upload.example.github.io/latest/2',
      assets: [{
        id: 76543
      }, {
        id: 12345
      }]
    }

    const github = {
      repos: {
        createRelease: jest.fn().mockResolvedValue({data: release}),
        getReleaseByTag: jest.fn().mockResolvedValue({data: latest}),
        deleteAsset: jest.fn().mockResolvedValue({}),
        uploadAsset: jest.fn().mockResolvedValue({})
      }
    }

    jest.mock('moment', () => () => ({format: () => '180130.12.34'}))
    const utils = require('./utils')

    try {
      const architectBuffer = Buffer.from('chunk1')
      const coachBuffer = Buffer.from('chunk2')

      await utils.release.create(
        github,
        'owner',
        'owner/repo',
        [
          {file: 'resume-architect.tex', data: architectBuffer},
          {file: 'resume-coach.tex', data: coachBuffer}
        ]
      )

      const expectUploadParams = [{
        url: 'http://upload.example.github.io/release/1',
        contentLength: architectBuffer.byteLength,
        contentType: 'application/pdf',
        file: architectBuffer,
        name: 'resume-architect.pdf',
        label: 'resume-architect'
      }, {
        url: 'http://upload.example.github.io/release/1',
        contentLength: coachBuffer.byteLength,
        contentType: 'application/pdf',
        file: coachBuffer,
        name: 'resume-coach.pdf',
        label: 'resume-coach'
      }, {
        url: 'http://upload.example.github.io/latest/2',
        contentLength: architectBuffer.byteLength,
        contentType: 'application/pdf',
        file: architectBuffer,
        name: 'resume-architect.pdf',
        label: 'resume-architect'
      }, {
        url: 'http://upload.example.github.io/latest/2',
        contentLength: coachBuffer.byteLength,
        contentType: 'application/pdf',
        file: coachBuffer,
        name: 'resume-coach.pdf',
        label: 'resume-coach'
      }].map(_ => [_])

      expect(github.repos.uploadAsset).toHaveBeenCalledTimes(4)
      expect(github.repos.uploadAsset.mock.calls).toEqual(expect.arrayContaining(expectUploadParams))

      done()
    } catch (err) {
      done(err)
    }
  })

  test('Should create an issue when a upload failed', async done => {
    const release = {
      upload_url: 'http://upload.example.github.io/release/1'
    }

    const latest = {
      upload_url: 'http://upload.example.github.io/latest/2',
      assets: [{
        id: 76543
      }, {
        id: 12345
      }]
    }

    const github = {
      repos: {
        createRelease: jest.fn().mockResolvedValue({data: release}),
        getReleaseByTag: jest.fn().mockResolvedValue({data: latest}),
        deleteAsset: jest.fn().mockResolvedValue({}),
        uploadAsset: jest.fn()
          .mockResolvedValue({})
          .mockRejectedValueOnce(new Error('upload failure 1'))
          .mockRejectedValueOnce(new Error('upload failure 2'))
      }
    }

    jest.mock('moment', () => () => ({format: () => '180130.12.34'}))
    const utils = require('./utils')
    utils.issues.create = jest.fn()

    try {
      await utils.release.create(
        github,
        'owner',
        'owner/repo',
        [
          {file: 'resume-architect.tex', data: 'chunk1'},
          {file: 'resume-coach.tex', data: 'chunk2'}
        ]
      )

      expect(github.repos.uploadAsset).toHaveBeenCalledTimes(4)
      expect(utils.issues.create).toHaveBeenCalledTimes(1)
      expect(utils.issues.create.mock.calls[0][0]).toEqual(github)
      expect(utils.issues.create.mock.calls[0][1]).toEqual('issue_uploadFailure')
      expect(utils.issues.create.mock.calls[0][2]).toEqual('owner')
      expect(utils.issues.create.mock.calls[0][3]).toEqual(['owner/repo'])
      expect(utils.issues.create.mock.calls[0][4]).toEqual({
        errors: [
          'upload failure 1',
          'upload failure 2'
        ]
      })

      done()
    } catch (err) {
      done(err)
    }
  })
})

describe('# Utils - Notify', () => {
  test('Should match the twitter credentials', done => {
    process.env.TWITTER_CONSUMER_KEY = 'consumer-key'
    process.env.TWITTER_CONSUMER_SECRET = 'consumer-secret'
    process.env.TWITTER_TOKEN_KEY = 'token-key'
    process.env.TWITTER_TOKEN_SECRET = 'token-secret'

    const Twitter = require('twitter')
    jest.mock('twitter')

    const checkConfig = jest.fn()
    Twitter.mockImplementation(_ => {
      checkConfig(_)
      return {
        post: jest.fn()
      }
    })

    const utils = require('./utils')
    utils.notify()

    expect(checkConfig.mock.calls[0][0]).toEqual({
      consumer_key: 'consumer-key',
      consumer_secret: 'consumer-secret',
      access_token_key: 'token-key',
      access_token_secret: 'token-secret'
    })
    done()
  })

  test('Should update the twitter status', done => {
    const Twitter = require('twitter')
    jest.mock('twitter')

    const postFn = jest.fn()
    Twitter.mockImplementation(_ => {
      return {
        post: postFn
      }
    })
    jest.mock('moment', () => () => ({format: () => '12:12:12'}))

    const utils = require('./utils')
    utils.notify('My message')

    expect(postFn.mock.calls[0][0]).toEqual('statuses/update')
    expect(postFn.mock.calls[0][1]).toEqual({status: '@olivierodo : gh-cv-assistant > My message\n12:12:12'})
    done()
  })
})
