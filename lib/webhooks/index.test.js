beforeEach(() => {
  jest.resetModules()
})

test('import the modules', () => {
  const index = require('./index')
  expect(Object.keys(index)).toEqual(['installation', 'push'])
})

test('import the installation modules', () => {
  jest.doMock('./installation', () => {
    return jest.fn(() => 'test')
  })
  const index = require('./index')
  expect(index.installation()).toEqual('test')
})

test('import the push modules', () => {
  jest.doMock('./push', () => {
    return jest.fn(() => 'test')
  })
  const index = require('./index')
  expect(index.push()).toEqual('test')
})
