import {generatePrivate} from '@toruslabs/eccrypto';
import {bridgeEmit, resolveMap} from '.';
import {TssLibAction, TssLibMessageType} from './common';
import '@toruslabs/tss-client';

console.log(global.js_send_msg);

export async function batch_size(): Promise<number> {
  let ruid = generatePrivate().toString('hex');
  console.log('batch_size', ruid);
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {ruid, action: TssLibAction.BatchSize, payload: {}},
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + 'batch_size', resolve);
  });
  console.log('batch_size', result);
  return result as number;
}

export async function random_generator(state: string): Promise<number> {
  let ruid = generatePrivate().toString('hex');
  console.log('random_generator', ruid);
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.RandomGenerator,
      payload: {state},
    },
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.RandomGenerator, resolve);
  });
  console.log('random_generator', result);
  return result as number;
}
export async function random_generator_free(rng: number): Promise<void> {
  let ruid = generatePrivate().toString('hex');
  console.log('random_generator_free', ruid);
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.RandomGeneratorFree,
      payload: {rng},
    },
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.RandomGeneratorFree, resolve);
  });
  console.log('random_generator_free', result);
}
export async function threshold_signer(
  session: string,
  player_index: number,
  player_count: number,
  threshold: number,
  share: string,
  pubkey: string,
): Promise<number> {
  console.log('threshold_signer', session);
  //   console.log('pubkey', pubkey);
  //   console.log('publickey', Buffer.from(pubkey, 'base64').length);
  //   console.log('share', share);
  const ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.ThresholdSigner,
      payload: {session, player_index, player_count, threshold, share, pubkey},
    },
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.ThresholdSigner, resolve);
  });
  console.log('threshold_signer', result);
  return result as number;
}
export async function threshold_signer_free(signer: number): Promise<void> {
  let ruid = generatePrivate().toString('hex');
  console.log('threshold_signer_free', ruid);
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.ThresholdSignerFree,
      payload: {signer},
    },
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.ThresholdSignerFree, resolve);
  });
  console.log('threshold_signer_free', result);
}

export async function setup(signer: number, rng: number): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  console.log('setup', ruid);
  console.log('setup', signer, rng);
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.Setup,
      payload: {signer, rng},
    },
  });
  const result = await new Promise(resolve => {
    console.log('setup resolve', ruid + TssLibAction.Setup);
    resolveMap.set(ruid + TssLibAction.Setup, resolve);
  });
  console.log('setup DONE', ruid, result);
  return result;
}

export async function precompute(
  parties: Uint8Array,
  signer: number,
  rng: number,
): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  console.log('precompute !!!!!!!', ruid);
  console.log('precompute', parties, signer, rng);

  console.log('parties buffer conversion', Array.from(parties));
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.Precompute,
      payload: {parties: Array.from(parties), signer, rng},
    },
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.Precompute, resolve);
  });

  return result;
}

export async function local_sign(
  msg: string,
  hash_only: boolean,
  precompute: any,
): any {
  let ruid = generatePrivate().toString('hex');
  console.log('local_sign', ruid);
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.LocalSign,
      payload: {msg, hash_only, precompute},
    },
  });
  return new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.LocalSign, resolve);
  });
}

export async function get_r_from_precompute(precompute: any): any {
  let ruid = generatePrivate().toString('hex');
  console.log('get_r_from_precompute', ruid, precompute);
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.GetRFromPrecompute,
      payload: {precompute},
    },
  });
  return new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.GetRFromPrecompute, resolve);
  });
}

export async function local_verify(
  msg: string,
  hash_only: boolean,
  r: any,
  sig_frags: any[],
  pubkey: string,
): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  console.log('local_verify', ruid);
  console.log('local_verify', {msg, hash_only, r, sig_frags, pubkey});
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.LocalVerify,
      payload: {msg, hash_only, r, sig_frags, pubkey},
    },
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.LocalVerify, resolve);
  });
  console.log('local_verify', result);
  return result;
}

export async function sign(
  counterparties: Uint8Array,
  msg: string,
  hash_only: boolean,
  signer: number,
  rng: number,
): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  console.log('sign', ruid);
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.Sign,
      payload: {counterparties, msg, hash_only, signer, rng},
    },
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.Sign, resolve);
  });
  console.log('sign', result);
  return result;
}
