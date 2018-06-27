const robot = {
  log: () => {},
  utils: {
    issues: {
      create: jest.fn(() => {})
    },
    release: {
      create: jest.fn()
    }
  }
}

beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
})

describe('Webhooks # push', () => {
  test('Should trigger any action if the webhooks is triggered from another branch than master', async done => {
    const push = require('./push')(robot)
    const context = {
      payload: {
        ref: 'refs/heads/myBranch'
      }
    }

    try {
      push(context)
      done()
    } catch (e) {
      done(e)
    };
  })

  describe('Retrieve file to compile', () => {
    test('Should fetch files name to compile from the config', async done => {
      const push = require('./push')(robot)
      const context = {
        payload: {
          ref: 'refs/heads/master'
        },
        config: jest.fn(() => Promise.reject('ee'))
      }
      try {
        await push(context)
      } catch (e) {
        expect(context.config).toHaveBeenCalledTimes(1)
        expect(context.config.mock.calls[0][0]).toEqual('cv-assistant.yml')
        done()
      }
    })

    test('Should create an issue if the files is are not  latex file', async done => {
      const push = require('./push')(robot)
      const context = {
        payload: {
          ref: 'refs/heads/master',
          repository: {
            private: false,
            full_name: 'foo/repo',
            name: 'repo'
          },
          sender: {
            login: 'user_foo'
          }
        },
        config: jest.fn(() => Promise.resolve({
          files: [
            'resume.pdf'
          ]
        }))
      }
      try {
        await push(context)
      } catch (e) {
        expect(e.message).toEqual('Please check your .github/cv-assistant.yml, the files need to be latex type (.tex)')
        expect(robot.utils.issues.create).toHaveBeenCalledTimes(1)
        expect(robot.utils.issues.create.mock.calls[0][0]).toEqual(context.github)
        expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_config_invalid_file')
        expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo')
        expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo'])
        done()
      }
    })

    test('Should create an issue if the file is not exist', async done => {
      const push = require('./push')(robot)
      const context = {
        payload: {
          ref: 'refs/heads/master',
          repository: {
            private: false,
            full_name: 'foo/repo',
            name: 'repo'
          },
          sender: {
            login: 'user_foo'
          }
        },
        config: jest.fn(() => Promise.resolve({
          files: [
            'resume.tex'
          ]
        })),
        github: {
          gitdata: {
            getTree: jest.fn(() => {
              return {
                data: {
                  'tree': [{
                    'path': 'README.md'
                  }]
                }
              }
            })
          }
        }
      }
      try {
        await push(context)
      } catch (e) {
        expect(e.message).toEqual('Please check your .github/cv-assistant.yml, some files are missing from your repository')

        expect(context.github.gitdata.getTree).toHaveBeenCalledTimes(1)
        const expectedConfig = {
          owner: 'foo',
          repo: 'repo',
          sha: 'master'
        }
        expect(context.github.gitdata.getTree.mock.calls[0][0]).toEqual(expectedConfig)

        expect(robot.utils.issues.create).toHaveBeenCalledTimes(1)
        expect(robot.utils.issues.create.mock.calls[0][0]).toEqual(context.github)
        expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_file_not_found')
        expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo')
        expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo'])
        done()
      }
    })

    test('Should create an issue when it fail to compile the files', async done => {
      const context = {
        payload: {
          ref: 'refs/heads/master',
          repository: {
            private: false,
            full_name: 'foo/repo',
            name: 'repo'
          },
          sender: {
            login: 'user_foo'
          }
        },
        config: jest.fn(() => Promise.resolve({
          files: [
            'resume-1.tex'
          ]
        })),
        github: {
          gitdata: {
            getTree: jest.fn(() => {
              return {
                data: {
                  'tree': [{
                    'path': 'resume-1.tex'
                  }]
                }
              }
            })
          }
        }
      }

      const rp = require('request')
      const fs = require('fs')

      const pipe = jest.fn()

      const EventEmitter = require('events')
      const _event = new EventEmitter()

      jest.mock('request')
      jest.mock('fs')

      const stream = fs.createWriteStream = jest.fn()
        .mockImplementationOnce(() => _event)

      rp.get = jest.fn()
        .mockImplementationOnce((options, cb) => {
          cb(undefined, { statusCode: 400 }, 'first call')
          _event.emit('close')
          return { pipe }
        })

      const push = require('./push')(robot)

      try {
        await push(context)

        const url = 'https://latexonline.cc/compile?git=https://github.com/foo/repo&target=resume-1.tex&command=xelatex'
        const requestOption = {
          url,
          headers: {
            'User-Agent': 'wget'
          }
        }

        expect(rp.get).toHaveBeenCalledTimes(1)
        expect(rp.get.mock.calls[0][0]).toEqual(requestOption)

        expect(pipe).toHaveBeenCalledTimes(1)

        expect(fs.createWriteStream).toHaveBeenCalledTimes(1)

        expect(robot.utils.issues.create).toHaveBeenCalledTimes(1)
        expect(robot.utils.issues.create.mock.calls[0][0]).toEqual(context.github)
        expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_fail_compile')
        expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo')
        expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo'])
        expect(robot.utils.issues.create.mock.calls[0][4]).toEqual({file: 'resume-1.tex', error: new Error('first call')})
        done()
      } catch (e) {
        done(e)
      }
    })

    test('Should create an issue when it all the documents fail to compile', async done => {
      const context = {
        payload: {
          ref: 'refs/heads/master',
          repository: {
            private: false,
            full_name: 'foo/repo',
            name: 'repo'
          },
          sender: {
            login: 'user_foo'
          }
        },
        config: jest.fn(() => Promise.resolve({
          files: [
            'resume-1.tex',
            'resume-2.tex'
          ]
        })),
        github: {
          gitdata: {
            getTree: jest.fn(() => {
              return {
                data: {
                  'tree': [{
                    'path': 'resume-1.tex'
                  }, {
                    'path': 'resume-2.tex'
                  }]
                }
              }
            })
          }
        }
      }

      const rp = require('request')
      const fs = require('fs')

      const pipe = jest.fn()

      const EventEmitter = require('events')
      const _event = new EventEmitter()

      jest.mock('request')
      jest.mock('fs')

      fs.createWriteStream = jest.fn()
        .mockImplementation(() => _event)

      rp.get = jest.fn()
        .mockImplementationOnce((options, cb) => {
          cb(new Error('first fail'))
          _event.emit('close')
          return { pipe }
        })
        .mockImplementationOnce((options, cb) => {
          cb(new Error('second fail'))
          _event.emit('close')
          return { pipe }
        })

      const push = require('./push')(robot)

      try {
        await push(context)

        const url1 = 'https://latexonline.cc/compile?git=https://github.com/foo/repo&target=resume-1.tex&command=xelatex'
        const url2 = 'https://latexonline.cc/compile?git=https://github.com/foo/repo&target=resume-2.tex&command=xelatex'
        const requestOption1 = {
          url: url1,
          headers: {
            'User-Agent': 'wget'
          }
        }
        const requestOption2 = {
          url: url2,
          headers: {
            'User-Agent': 'wget'
          }
        }

        expect(rp.get).toHaveBeenCalledTimes(2)
        expect(rp.get.mock.calls[0][0]).toEqual(requestOption1)
        expect(rp.get.mock.calls[1][0]).toEqual(requestOption2)

        expect(pipe).toHaveBeenCalledTimes(2)

        expect(fs.createWriteStream).toHaveBeenCalledTimes(2)

        expect(robot.utils.issues.create).toHaveBeenCalledTimes(2)
        expect(robot.utils.issues.create.mock.calls[0][0]).toEqual(context.github)
        expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_fail_compile')
        expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo')
        expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo'])
        expect(robot.utils.issues.create.mock.calls[0][4]).toEqual({file: 'resume-1.tex', error: new Error('first fail')})
        expect(robot.utils.issues.create.mock.calls[1][0]).toEqual(context.github)
        expect(robot.utils.issues.create.mock.calls[1][1]).toEqual('issue_fail_compile')
        expect(robot.utils.issues.create.mock.calls[1][2]).toEqual('user_foo')
        expect(robot.utils.issues.create.mock.calls[1][3]).toEqual(['foo/repo'])
        expect(robot.utils.issues.create.mock.calls[1][4]).toEqual({file: 'resume-2.tex', error: new Error('second fail')})
        done()
      } catch (e) {
        done(e)
      }
    })

    test('Should create an issue when it one of the documents fail to compile', async done => {
      const context = {
        payload: {
          ref: 'refs/heads/master',
          repository: {
            private: false,
            full_name: 'foo/repo',
            name: 'repo'
          },
          sender: {
            login: 'user_foo'
          }
        },
        config: jest.fn(() => Promise.resolve({
          files: [
            'resume-1.tex',
            'resume-2.tex'
          ]
        })),
        github: {
          gitdata: {
            getTree: jest.fn(() => {
              return {
                data: {
                  'tree': [{
                    'path': 'resume-1.tex'
                  }, {
                    'path': 'resume-2.tex'
                  }]
                }
              }
            })
          }
        }
      }

      const rp = require('request')
      const fs = require('fs')

      const pipe = jest.fn()

      const EventEmitter = require('events')
      const _event = new EventEmitter()

      jest.mock('request')
      jest.mock('fs')

      fs.createWriteStream = jest.fn()
        .mockImplementation(() => _event)

      fs.readFile = jest.fn()
        .mockImplementation((path, cb) => cb(undefined, 'chunk'))

      fs.unlinkSync = jest.fn()

      rp.get = jest.fn()
        .mockImplementationOnce((options, cb) => {
          cb(undefined, { statusCode: 200 }, 'chunk')
          _event.emit('close')
          return { pipe }
        })
        .mockImplementationOnce((options, cb) => {
          cb(new Error('fail'), { statusCode: 400})
          _event.emit('close')
          return { pipe }
        })

      const push = require('./push')(robot)

      try {
        await push(context)

        const url1 = 'https://latexonline.cc/compile?git=https://github.com/foo/repo&target=resume-1.tex&command=xelatex'
        const url2 = 'https://latexonline.cc/compile?git=https://github.com/foo/repo&target=resume-2.tex&command=xelatex'
        const requestOption1 = {
          url: url1,
          headers: {
            'User-Agent': 'wget'
          }
        }
        const requestOption2 = {
          url: url2,
          headers: {
            'User-Agent': 'wget'
          }
        }

        expect(rp.get).toHaveBeenCalledTimes(2)
        expect(rp.get.mock.calls[0][0]).toEqual(requestOption1)
        expect(rp.get.mock.calls[1][0]).toEqual(requestOption2)

        expect(pipe).toHaveBeenCalledTimes(2)

        expect(fs.createWriteStream).toHaveBeenCalledTimes(2)
        expect(fs.readFile).toHaveBeenCalledTimes(2)
        expect(fs.unlinkSync).toHaveBeenCalledTimes(2)

        expect(robot.utils.issues.create).toHaveBeenCalledTimes(1)
        expect(robot.utils.issues.create.mock.calls[0][0]).toEqual(context.github)
        expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_fail_compile')
        expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo')
        expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo'])
        expect(robot.utils.issues.create.mock.calls[0][4]).toEqual({file: 'resume-2.tex', error: new Error('fail')})

        expect(robot.utils.release.create).toHaveBeenCalledTimes(1)
        expect(robot.utils.release.create.mock.calls[0][0]).toEqual(context.github)
        expect(robot.utils.release.create.mock.calls[0][1]).toEqual('user_foo')
        expect(robot.utils.release.create.mock.calls[0][2]).toEqual('foo/repo')
        expect(robot.utils.release.create.mock.calls[0][3]).toEqual([{file: 'resume-1.tex', data: 'chunk'}])
        done()
      } catch (e) {
        done(e)
      }
    })

    test('Should create the release with all the compiled files', async done => {
      const context = {
        payload: {
          ref: 'refs/heads/master',
          repository: {
            private: false,
            full_name: 'foo/repo',
            name: 'repo'
          },
          sender: {
            login: 'user_foo'
          }
        },
        config: jest.fn(() => Promise.resolve({
          files: [
            'resume-1.tex',
            'resume-2.tex'
          ]
        })),
        github: {
          gitdata: {
            getTree: jest.fn(() => {
              return {
                'data': {
                  'tree': [{
                    'path': 'resume-1.tex'
                  }, {
                    'path': 'resume-2.tex'
                  }]
                }
              }
            })
          }
        }
      }

      const rp = require('request')
      const fs = require('fs')

      const pipe = jest.fn()

      const EventEmitter = require('events')
      const _event1 = new EventEmitter()
      const _event2 = new EventEmitter()

      jest.mock('request')
      jest.mock('fs')

      fs.createWriteStream = jest.fn()
        .mockImplementationOnce(() => _event1)
        .mockImplementationOnce(() => _event2)

      fs.readFile = jest.fn()
        .mockImplementationOnce((path, cb) => cb(undefined, 'chunk1'))
        .mockImplementationOnce((path, cb) => cb(undefined, 'chunk2'))

      fs.unlinkSync = jest.fn()

      rp.get = jest.fn()
        .mockImplementationOnce((options, cb) => {
          cb(undefined, { statusCode: 200 }, 'chunk1')
          _event1.emit('close')
          return { pipe }
        })
        .mockImplementationOnce((options, cb) => {
          cb(undefined, { statusCode: 200 }, 'chunk2')
          _event2.emit('close')
          return { pipe }
        })

      const push = require('./push')(robot)

      try {
        await push(context)

        const url1 = 'https://latexonline.cc/compile?git=https://github.com/foo/repo&target=resume-1.tex&command=xelatex'
        const url2 = 'https://latexonline.cc/compile?git=https://github.com/foo/repo&target=resume-2.tex&command=xelatex'
        const requestOption1 = {
          url: url1,
          headers: {
            'User-Agent': 'wget'
          }
        }
        const requestOption2 = {
          url: url2,
          headers: {
            'User-Agent': 'wget'
          }
        }

        expect(rp.get).toHaveBeenCalledTimes(2)
        expect(rp.get.mock.calls[0][0]).toEqual(requestOption1)
        expect(rp.get.mock.calls[1][0]).toEqual(requestOption2)

        expect(fs.createWriteStream).toHaveBeenCalledTimes(2)
        expect(fs.readFile).toHaveBeenCalledTimes(2)
        expect(fs.unlinkSync).toHaveBeenCalledTimes(2)

        expect(robot.utils.issues.create).toHaveBeenCalledTimes(0)

        expect(robot.utils.release.create).toHaveBeenCalledTimes(1)
        expect(robot.utils.release.create.mock.calls[0][0]).toEqual(context.github)
        expect(robot.utils.release.create.mock.calls[0][1]).toEqual('user_foo')
        expect(robot.utils.release.create.mock.calls[0][2]).toEqual('foo/repo')
        const expectedResultFile = [{
          file: 'resume-1.tex',
          data: 'chunk1',
          file: 'resume-2.tex',
          data: 'chunk2'
        }]
        expect(robot.utils.release.create.mock.calls[0][3].length).toEqual(2)
        expect(robot.utils.release.create.mock.calls[0][3]).toEqual(expect.arrayContaining(expectedResultFile))
        done()
      } catch (e) {
        done(e)
      }
    })
  })
})
