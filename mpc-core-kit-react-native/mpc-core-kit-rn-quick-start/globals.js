// global.Buffer = require('buffer').Buffer;
if (typeof __dirname === 'undefined') global.__dirname = '/'
if (typeof __filename === 'undefined') global.__filename = ''
if (typeof process === 'undefined') {
  global.process = require('process')
} else {
  const bProcess = require('process')
  for (var p in bProcess) {
    if (!(p in process)) {
      process[p] = bProcess[p]
    }
  }
}

process.browser = false
if (typeof Buffer === 'undefined') global.Buffer = require('buffer').Buffer

// global.location = global.location || { port: 80 }
const isDev = typeof __DEV__ === 'boolean' && __DEV__
process.env['NODE_ENV'] = isDev ? 'development' : 'production'
if (typeof localStorage !== 'undefined') {
  localStorage.debug = isDev ? '*' : ''
}

// If using the crypto shim, uncomment the following line to ensure
// crypto is loaded first, so it can populate global.crypto
// require('crypto')

console.log(Buffer.from( 'Hello World!', "utf-8" ).toString('base64'))
// Needed so that 'stream-http' chooses the right default protocol.
global.location = {
  protocol: 'file:',
};

global.process.version = 'v16.0.0';
if (!global.process.version) {
  global.process = require('process');
  console.log({process: global.process});
}

process.browser = true;


const TextEncodingPolyfill = require('text-encoding');
// const WebAssembly = require('react-native-webassembly');

// const BigInt = require('big-integer')
Object.assign(global, {
  TextEncoder: TextEncodingPolyfill.TextEncoder,
  TextDecoder: TextEncodingPolyfill.TextDecoder,
  // WebAssembly: WebAssembly,
  // BigInt: BigInt,
});