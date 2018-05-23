beforeEach(() => {
  jest.resetModules();
});

describe('# Utils - Issues - create', () => {
  test('Should create a new issue', () => {
    const github = {
      issues : {
        create : jest.fn(() => {})
      }
    };
    jest.mock('fs', () => {
      return {
        readFileSync : () => {}
      };
    });
    jest.mock('js-yaml', () => {
      return {
        safeLoad : jest.fn(() => ({title: 'myTmplTitle', body : 'myTmplBody'})),
      };
    });
    const utils = require('./utils');
    utils.issues.create(github, 'myTmpl', 'myUser', ['owner/repo']);
    const expectedConfig = {
      owner : 'owner',
      repo: 'repo',
      title : 'myTmplTitle',
      body : 'myTmplBody',
      assignees: ['myUser']
    };
    expect(github.issues.create).toHaveBeenCalledTimes(1);
    expect(github.issues.create.mock.calls[0][0]).toEqual(expectedConfig);
  });

  test('Should create a new issue and update the template with dynamic values', () => {
    const github = {
      issues : {
        create : jest.fn(() => {})
      }
    };
    jest.mock('fs', () => {
      return {
        readFileSync : () => {}
      };
    });
    jest.mock('js-yaml', () => {
      return {
        safeLoad : jest.fn(() => ({title: 'myTmplTitle {{foo}}', body : 'myTmplBody {{foo}} {{bar}}'})),
      };
    });
    const utils = require('./utils');
    utils.issues.create(github, 'myTmpl', 'myUser', ['owner/repo'], {foo : 'foo_replace', bar : 'bar_replace'});
    const expectedConfig = {
      owner : 'owner',
      repo: 'repo',
      title : 'myTmplTitle foo_replace',
      body : 'myTmplBody foo_replace bar_replace',
      assignees: ['myUser']
    };
    expect(github.issues.create).toHaveBeenCalledTimes(1);
    expect(github.issues.create.mock.calls[0][0]).toEqual(expectedConfig);
  });
});
