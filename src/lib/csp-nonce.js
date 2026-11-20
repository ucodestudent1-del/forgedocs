// Simple module-level CSP nonce store (plain JavaScript for next.config.js compatibility)
let currentCSPNonce = undefined

function setCSPNonce(nonce) {
  currentCSPNonce = nonce
}

function getCSPNonce() {
  return currentCSPNonce
}

function clearCSPNonce() {
  currentCSPNonce = undefined
}

function runWithCSPNonce(nonce, fn) {
  const prev = currentCSPNonce
  currentCSPNonce = nonce
  try {
    return fn()
  } finally {
    currentCSPNonce = prev
  }
}

module.exports = { setCSPNonce, getCSPNonce, clearCSPNonce, runWithCSPNonce }
