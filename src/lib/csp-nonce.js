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

module.exports = { setCSPNonce, getCSPNonce, clearCSPNonce }
