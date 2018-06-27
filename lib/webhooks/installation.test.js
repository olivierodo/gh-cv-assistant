const robot = {
  log: () => {},
  utils: {
    issues: {
      create: jest.fn(() => {})
    },
    pullRequest: {
      setupResume: jest.fn(() => {})
    }
  }
}

beforeEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
})

describe('Checking if the webhooks is triggered from a installation creation', () => {
  test('Should not start the setup if the action is not created', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'deleted'
      }
    }
    try {
      const result = await installation(context)
      expect(result).toEqual(undefined)
      done()
    } catch (e) {
      done(e)
    };
  })

  test('Should start the setup if the action is  created', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'created'
      }
    }
    try {
      const result = await installation(context)
      done('It should throw an error because we didn\'t mock anything')
    } catch (e) {
      // Should be catch here because we can't run the code as it is.
      done()
    };
  })
})

describe('Checking if the app is intalled on 1 repository at the time (organisation)', () => {
  test('Should stop the setup if there is no repository', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'created',
        repositories: []
      }
    }
    try {
      const result = await installation(context)
      done('It should throw an error because we didn\'t mock anything')
    } catch (e) {
      expect(e.message).toEqual('Please specify a repository')
      done()
    };
  })

  test('Should create an issue if there is more than 1 repository', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'created',
        repositories: [{
          full_name: 'foo/repo1'
        }, {
          full_name: 'foo/repo2'
        }],
        sender: {
          login: 'user_foo'
        }
      },
      github: 'github',
      config: jest.fn(() => 'tmpl')
    }

    try {
      const result = await installation(context)
      done('It should throw an error because we didn\'t mock anything')
    } catch (e) {
      expect(robot.utils.issues.create).toHaveBeenCalledTimes(1)
      expect(robot.utils.issues.create.mock.calls[0][0]).toEqual('github')
      expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_multiple_repositories')
      expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo')
      expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo1', 'foo/repo2'])
      expect(e.message).toEqual('Multiple repositories found')
      done()
    };
  })

  test('Should continue the setup if there is only 1 repository', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'created',
        repositories: [{
          full_name: 'foo/repo'
        }],
        sender: {
          login: 'user_foo'
        }
      },
      github: 'github'
    }

    try {
      const result = await installation(context)
      done('It should throw an error because we didn\'t mock anything')
    } catch (e) {
      // Should catch an error because we are going through without mock
      done()
    };
  })
})

describe('Checking if the app is installed on a public repository', () => {
  test('Should create an issue if the repository is private', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'created',
        repositories: [{
          private: true,
          full_name: 'foo/repo'
        }],
        sender: {
          login: 'user_foo'
        }
      },
      github: 'github'
    }

    try {
      const result = await installation(context)
      done('It should throw an error because we didn\'t mock anything')
    } catch (e) {
      expect(robot.utils.issues.create).toHaveBeenCalledTimes(1)
      expect(robot.utils.issues.create.mock.calls[0][0]).toEqual('github')
      expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_private_repository')
      expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo')
      expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo'])
      expect(e.message).toEqual('Private repositories found')
      done()
    };
  })

  test('Should continue the setup if there is only 1 public repository', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'created',
        repositories: [{
          full_name: 'foo/repo',
          private: false
        }],
        sender: {
          login: 'user_foo'
        }
      },
      github: 'github'
    }

    try {
      const result = await installation(context)
      done('It should throw an error because we didn\'t mock anything')
    } catch (e) {
      // Should catch an error because we are going through without mock
      done()
    };
  })
})

describe('Checking if there is file matching the standards in the repository', () => {
  test('Should create an issue if the repository doesn\'t contain a resume.tex file', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'created',
        repositories: [{
          private: false,
          full_name: 'foo/repo',
          name: 'repo'
        }],
        sender: {
          login: 'user_foo'
        }
      },
      github: {
        repos: {
          getTree: jest.fn(() => {
            return {
              'tree': [{
                'path': 'README.md'
              }]
            }
          })
        }
      }
    }

    const result = await installation(context)

    const expectedGetTreeOptions = {
//      owner : 'foo',
//      repo: 'repo',
      tree_sha: 'master'
    }

    expect(context.github.repos.getTree).toHaveBeenCalledTimes(1)
    expect(context.github.repos.getTree.mock.calls[0][0]).toEqual(expectedGetTreeOptions)

    expect(robot.utils.issues.create).toHaveBeenCalledTimes(1)
    expect(robot.utils.issues.create.mock.calls[0][0]).toEqual(context.github)
    expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_empty_repository')
    expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo')
    expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo'])

    expect(robot.utils.pullRequest.setupResume).toHaveBeenCalledTimes(1)
    expect(robot.utils.pullRequest.setupResume.mock.calls[0][0]).toEqual(context.github)
    expect(robot.utils.pullRequest.setupResume.mock.calls[0][1]).toEqual('user_foo')
    expect(robot.utils.pullRequest.setupResume.mock.calls[0][2]).toEqual(['foo/repo'])
    done()
  })

  test('Should not create an issue/pullRequest if the resume-*.tex exists', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'created',
        repositories: [{
          private: false,
          full_name: 'foo/repo',
          name: 'repo'
        }],
        sender: {
          login: 'user_foo'
        }
      },
      github: {
        repos: {
          getTree: jest.fn(() => {
            return {
              'tree': [{
                'path': 'resume-coach.tex'
              }]
            }
          })
        }
      }
    }

    const result = await installation(context)

    const expectedGetTreeOptions = {
//      owner : 'foo',
 //     repo: 'repo',
      tree_sha: 'master'
    }

    expect(context.github.repos.getTree).toHaveBeenCalledTimes(1)
    expect(context.github.repos.getTree.mock.calls[0][0]).toEqual(expectedGetTreeOptions)

    expect(robot.utils.issues.create).toHaveBeenCalledTimes(0)
    expect(robot.utils.pullRequest.setupResume).toHaveBeenCalledTimes(0)
    done()
  })

  test('Should not create an issue/pullRequest if the resume.tex exists', async done => {
    const installation = require('./installation')(robot)
    const context = {
      payload: {
        action: 'created',
        repositories: [{
          private: false,
          full_name: 'foo/repo',
          name: 'repo'
        }],
        sender: {
          login: 'user_foo'
        }
      },
      github: {
        repos: {
          getTree: jest.fn(() => {
            return {
              'tree': [{
                'path': 'resume.tex'
              }]
            }
          })
        }
      }
    }

    const result = await installation(context)

    const expectedGetTreeOptions = {
//      owner : 'foo',
 //     repo: 'repo',
      tree_sha: 'master'
    }

    expect(context.github.repos.getTree).toHaveBeenCalledTimes(1)
    expect(context.github.repos.getTree.mock.calls[0][0]).toEqual(expectedGetTreeOptions)

    expect(robot.utils.issues.create).toHaveBeenCalledTimes(0)
    expect(robot.utils.pullRequest.setupResume).toHaveBeenCalledTimes(0)
    done()
  })
})
