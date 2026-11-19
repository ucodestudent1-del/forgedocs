const { AsyncLocalStorage } = require("async_hooks")

const cspNonceStorage = new AsyncLocalStorage()

function setCSPNonce(nonce) {
  cspNonceStorage.enterWith(nonce)
}

function getCSPNonce() {
  return cspNonceStorage.getStore()
}

function clearCSPNonce() {
  cspNonceStorage.disable()
  cspNonceStorage.enable()
}

function runWithCSPNonce(nonce, fn) {
  return cspNonceStorage.run(nonce, fn)
}

module.exports = { setCSPNonce, getCSPNonce, clearCSPNonce, runWithCSPNonce }