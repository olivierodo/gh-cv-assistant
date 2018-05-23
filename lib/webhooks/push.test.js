const robot = {
  log : () => {},
  utils: {
    issues : {
      create : jest.fn(() => {})
    },
  }
};

beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
});

describe('Webhooks # push',  () => {
  test('Should trigger any action if the webhooks is triggered from another branch than master', async done => {
    const push = require('./push')(robot);
    const context = {
      payload : {
        ref : 'refs/heads/myBranch'
      }
    };

    try {
      push(context);
      done();
    } catch(e) {
      done(e);
    };

  });

  describe('Retrieve file to compile', () => {
    
    test('Should fetch files name to compile from the config', async done => {
      const push = require('./push')(robot);
        const context = {
          payload : {
            ref : 'refs/heads/master'
          },
          config : jest.fn(() => Promise.reject('ee'))
        };
      try {
        await push(context);
      } catch(e) {
        expect(context.config).toHaveBeenCalledTimes(1);
        expect(context.config.mock.calls[0][0]).toEqual('cv-assistant.yml');
        done();
      }

    });

    test('Should create an issue if the files is are not  latex file', async done => {
      const push = require('./push')(robot);
        const context = {
          payload : {
            ref : 'refs/heads/master',
            repository: {
              private: false,
              full_name : 'foo/repo',
              name: 'repo',
            },
            sender: {
              login: 'user_foo'
            }
          },
          config : jest.fn(() => Promise.resolve({
            files : [
              'resume.pdf'
            ]
          }))
        };
      try {
        await push(context);
      } catch(e) {
        expect(e.message).toEqual('Please check your .github/cv-assistant.yml, the files need to be latex type (.tex)');
        expect(robot.utils.issues.create).toHaveBeenCalledTimes(1);
        expect(robot.utils.issues.create.mock.calls[0][0]).toEqual(context.github);
        expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_config_invalid_file');
        expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo');
        expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo']);
        done();
      }
    });

    test('Should create an issue if the file is not exist', async done => {
      const push = require('./push')(robot);
        const context = {
          payload : {
            ref : 'refs/heads/master',
            repository: {
              private: false,
              full_name : 'foo/repo',
              name: 'repo',
            },
            sender: {
              login: 'user_foo'
            }
          },
          config : jest.fn(() => Promise.resolve({
            files : [
              'resume.tex'
            ]
          })),
          github : {
            repos : {
              getTree :  jest.fn(() => {
                return {
                  "tree": [{
                    "path": "README.md",
                  }]
                }
              })
            }
          },
        };
      try {
        await push(context);
      } catch(e) {
        expect(e.message).toEqual('Please check your .github/cv-assistant.yml, some files are missing from your repository');

        expect(context.github.repos.getTree).toHaveBeenCalledTimes(1);
        expect(context.github.repos.getTree.mock.calls[0][0]).toEqual({tree_sha: 'master'});

        expect(robot.utils.issues.create).toHaveBeenCalledTimes(1);
        expect(robot.utils.issues.create.mock.calls[0][0]).toEqual(context.github);
        expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_file_not_found');
        expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo');
        expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo']);
        done();
      }
    });

    test('Should compile the files to retrieve', async done => {
      const context = {
        payload : {
          ref : 'refs/heads/master',
          repository: {
            private: false,
            full_name : 'foo/repo',
            name: 'repo',
          },
          sender: {
            login: 'user_foo'
          }
        },
        config : jest.fn(() => Promise.resolve({
          files : [
            'resume-1.tex',
            'resume-2.tex',
          ]
        })),
        github : {
          repos : {
            getTree :  jest.fn(() => {
              return {
                "tree": [{
                  "path": "resume-1.tex",
                },{
                  "path": "resume-2.tex",
                }]
              }
            })
          }
        },
      };
      
      const push = require('./push')(robot);

      jest.mock('request-promise', async () => {
        return jest.fn()
          .mockResolvedValue()
          .mockRejectedValueOnce()
      });

      try {
        //await push(context);
      } catch(e) {
        
        expect(e.message).toEqual('Please check your .github/cv-assistant.yml, some files are missing from your repository');

        expect(context.github.repos.getTree).toHaveBeenCalledTimes(1);
        expect(context.github.repos.getTree.mock.calls[0][0]).toEqual({tree_sha: 'master'});

        expect(robot.utils.issues.create).toHaveBeenCalledTimes(1);
        expect(robot.utils.issues.create.mock.calls[0][0]).toEqual(context.github);
        expect(robot.utils.issues.create.mock.calls[0][1]).toEqual('issue_file_not_found');
        expect(robot.utils.issues.create.mock.calls[0][2]).toEqual('user_foo');
        expect(robot.utils.issues.create.mock.calls[0][3]).toEqual(['foo/repo']);
        done();
      }
    });
  });
});

