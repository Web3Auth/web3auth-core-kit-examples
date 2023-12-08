import {generatePrivate} from '@toruslabs/eccrypto';
import {bridgeEmit, resolveMap} from '.';
import {TssLibAction, TssLibMessageType} from './common';
import '@toruslabs/tss-client';

export async function batch_size(): Promise<number> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {ruid, action: TssLibAction.BatchSize, payload: {}},
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + 'batch_size', resolve);
  });
  return result as number;
}

export async function random_generator(state: string): Promise<number> {
  let ruid = generatePrivate().toString('hex');
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
  return result as number;
}
export async function random_generator_free(rng: number): Promise<void> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.RandomGeneratorFree,
      payload: {rng},
    },
  });
  await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.RandomGeneratorFree, resolve);
  });
}
export async function threshold_signer(
  session: string,
  player_index: number,
  player_count: number,
  threshold: number,
  share: string,
  pubkey: string,
): Promise<number> {
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
  return result as number;
}
export async function threshold_signer_free(signer: number): Promise<void> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.ThresholdSignerFree,
      payload: {signer},
    },
  });
  await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.ThresholdSignerFree, resolve);
  });
}

export async function setup(signer: number, rng: number): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.Setup,
      payload: {signer, rng},
    },
  });
  const result = await new Promise(resolve => {
    resolveMap.set(ruid + TssLibAction.Setup, resolve);
  });
  return result;
}

export async function precompute(
  parties: Uint8Array,
  signer: number,
  rng: number,
): Promise<any> {
  let ruid = generatePrivate().toString('hex');

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
): Promise<any> {
  let ruid = generatePrivate().toString('hex');
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

export async function get_r_from_precompute(precompute: any): Promise<any> {
  let ruid = generatePrivate().toString('hex');
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
  return result;
}
