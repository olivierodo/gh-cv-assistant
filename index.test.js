beforeEach(() => {
  jest.resetModules()
})

test('Should start the bot', () => {
  const index = require('./index')
  const robot = {}
  robot.log = jest.fn(() => {})
  robot.on = jest.fn(() => {})
  index(robot)
  expect(robot.log).toBeCalled()
})

test('Should set the utils', () => {
  jest.mock('./lib/utils', () => {
    return {
      foo: jest.fn(() => 'foo'),
      bar: jest.fn(() => 'bar')
    }
  })

  const index = require('./index')
  const robot = {}
  robot.log = jest.fn(() => {})
  robot.on = jest.fn(() => {})

  index(robot)
  expect(robot.utils).toHaveProperty('foo')
  expect(robot.utils).toHaveProperty('bar')
})

test('Should Load the webhooks', () => {
  jest.mock('./lib/webhooks', () => {
    return {
      foo: jest.fn(() => 'foo'),
      bar: jest.fn(() => 'bar'),
      test: jest.fn(() => 'test')
    }
  })

  const index = require('./index')

  const robot = {}
  robot.log = jest.fn(() => {})
  robot.on = jest.fn(() => {})

  index(robot)
  expect(robot.on).toHaveBeenCalledTimes(3)
  expect(robot.on.mock.calls[0][0]).toEqual('foo')
  expect(robot.on.mock.calls[1][0]).toEqual('bar')
  expect(robot.on.mock.calls[2][0]).toEqual('test')
})
