export class Queue {
  constructor() {}
  add() { return Promise.resolve({ id: 'test-job' }) }
  pause() { return Promise.resolve() }
  close() { return Promise.resolve() }
  isPaused() { return false }
  getJobCount() { return Promise.resolve(0) }
}
export class Worker {
  constructor() {}
  on() { return this }
  close() { return Promise.resolve() }
  isPaused() { return false }
  getJobCount() { return Promise.resolve(0) }
}
