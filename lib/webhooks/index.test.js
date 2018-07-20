beforeEach(() => {
  jest.resetModules()
})

test('import the modules', () => {
  const index = require('./index')
  expect(Object.keys(index)).toEqual(['installation', 'push', 'installation_repositories'])
})

test('import the installation modules', () => {
  jest.doMock('./installation', () => {
    return jest.fn(() => 'test')
  })
  const index = require('./index')
  expect(index.installation()).toEqual('test')
  expect(index.installation_repositories()).toEqual('test')
})

test('import the push modules', () => {
  jest.doMock('./push', () => {
    return jest.fn(() => 'test')
  })
  const index = require('./index')
  expect(index.push()).toEqual('test')
})
