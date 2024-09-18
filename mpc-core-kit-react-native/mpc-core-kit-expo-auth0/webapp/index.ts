import * as lib from './tsslib';
export * from './Bridge';

const tssLib = {
    keyType: "secp256k1",
    lib : lib,
};
  
export { tssLib };
export default lib;