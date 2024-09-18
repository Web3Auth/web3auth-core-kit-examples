import { generatePrivate } from '@toruslabs/eccrypto';
import { bridgeEmit, rejectMap, resolveMap } from './Bridge';
import { TssLibAction, TssLibMessageType } from './common';

export async function batch_size(): Promise<number> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: { ruid, action: TssLibAction.BatchSize, payload: {} },
  });
  const result = await new Promise((resolve, reject) => {
    resolveMap.set(ruid + 'batch_size', resolve);
    rejectMap.set(ruid + 'batch_size', reject);
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
      payload: { state },
    },
  });
  const result = await new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.RandomGenerator, resolve);
    rejectMap.set(ruid + TssLibAction.RandomGenerator, reject);
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
      payload: { rng },
    },
  });
  await new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.RandomGeneratorFree, resolve);
    rejectMap.set(ruid + TssLibAction.RandomGeneratorFree, reject);
  });
}
export async function threshold_signer(
  session: string,
  player_index: number,
  player_count: number,
  threshold: number,
  share: string,
  pubkey: string
): Promise<number> {
  const ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.ThresholdSigner,
      payload: {
        session,
        player_index,
        player_count,
        threshold,
        share,
        pubkey,
      },
    },
  });
  const result = await new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.ThresholdSigner, resolve);
    rejectMap.set(ruid + TssLibAction.ThresholdSigner, reject);
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
      payload: { signer },
    },
  });
  await new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.ThresholdSignerFree, resolve);
    rejectMap.set(ruid + TssLibAction.ThresholdSignerFree, reject);
  });
}

export async function setup(signer: number, rng: number): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.Setup,
      payload: { signer, rng },
    },
  });
  const result = await new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.Setup, resolve);
    rejectMap.set(ruid + TssLibAction.Setup, reject);
  });
  return result;
}

export async function precompute(
  parties: Uint8Array,
  signer: number,
  rng: number
): Promise<any> {
  let ruid = generatePrivate().toString('hex');

  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.Precompute,
      payload: { parties: Array.from(parties), signer, rng },
    },
  });
  const result = await new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.Precompute, resolve);
    rejectMap.set(ruid + TssLibAction.Precompute, reject);
  });

  return result;
}

export async function local_sign(
  msg: string,
  hash_only: boolean,
  precompute: any
): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.LocalSign,
      payload: { msg, hash_only, precompute },
    },
  });
  return new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.LocalSign, resolve);
    rejectMap.set(ruid + TssLibAction.LocalSign, reject);
  });
}

export async function get_r_from_precompute(precompute: any): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.GetRFromPrecompute,
      payload: { precompute },
    },
  });
  return new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.GetRFromPrecompute, resolve);
    rejectMap.set(ruid + TssLibAction.GetRFromPrecompute, reject);
  });
}

export async function local_verify(
  msg: string,
  hash_only: boolean,
  r: any,
  sig_frags: any[],
  pubkey: string
): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.LocalVerify,
      payload: { msg, hash_only, r, sig_frags, pubkey },
    },
  });
  const result = await new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.LocalVerify, resolve);
    rejectMap.set(ruid + TssLibAction.LocalVerify, reject);
  });
  return result;
}

export async function sign(
  counterparties: Uint8Array,
  msg: string,
  hash_only: boolean,
  signer: number,
  rng: number
): Promise<any> {
  let ruid = generatePrivate().toString('hex');
  bridgeEmit({
    type: TssLibMessageType.TssLibRequest,
    data: {
      ruid,
      action: TssLibAction.Sign,
      payload: { counterparties, msg, hash_only, signer, rng },
    },
  });
  const result = await new Promise((resolve, reject) => {
    resolveMap.set(ruid + TssLibAction.Sign, resolve);
    rejectMap.set(ruid + TssLibAction.Sign, reject);
  });
  return result;
}
