global.Buffer = require('buffer').Buffer;

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
