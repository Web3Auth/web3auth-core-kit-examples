import React, {useEffect} from 'react';
import {
  webViewRender,
  emit,
  useNativeMessage,
} from 'react-native-react-bridge/lib/web';
import * as TssLib from '@toruslabs/tss-lib';
import {
  TssLibAction,
  TssLibMessageResponse,
  TssLibMessageRequest,
  TssLibMessageType,
} from '../common';

const style = {
  width: '100vw',
  height: '0vh',
  margin: 'auto',
  backgroundColor: 'lightblue',
};

let bridgeEmit: any;
const debug = (data: any) => {
  bridgeEmit({
    type: 'debug',
    data,
  });
};
const error = (data: any) => {
  bridgeEmit({
    type: 'error',
    data,
  });
};

let resolverMap = new Map();

if (globalThis.js_read_msg === undefined) {
  globalThis.js_read_msg = async function (
    session: string,
    self_index: number,
    party: number,
    msg_type: string,
  ) {
    const ruid = session + party + msg_type;
    // debug({type: 'js_read_msg', msg: 'start', ruid});
    bridgeEmit({
      type: TssLibMessageType.TssLibRequest,
      data: {
        ruid,
        action: TssLibAction.JsReadMsg,
        payload: {session, self_index, party, msg_type},
      },
    });
    const result = await new Promise(resolve => {
      resolverMap.set(ruid + '-js_read_msg', resolve);
      // setTimeout(() => {
      //   reject('timeout');
      // }, 5000);
    });
    console.log('js_read_msg DONE', result);

    return result;
  };
}

if (globalThis.js_send_msg === undefined) {
  globalThis.js_send_msg = async function (
    session: string,
    self_index: number,
    party: number,
    msg_type: string,
    msg_data?: string,
  ) {
    const ruid = session + party + msg_type;
    // debug({type: 'js_send_msg', msg: 'start', ruid});
    bridgeEmit({
      type: TssLibMessageType.TssLibRequest,
      data: {
        ruid,
        action: TssLibAction.JsSendMsg,
        payload: {session, self_index, party, msg_type, msg_data},
      },
    });
    const result = await new Promise(resolve => {
      resolverMap.set(ruid + '-js_send_msg', resolve);
    });
    return result;
  };
}

TssLib.default('https://node-1.node.web3auth.io/tss/v1/clientWasm');

async function handleTssLib(
  data: TssLibMessageRequest,
): Promise<TssLibMessageResponse> {
  const {action, payload, ruid} = data as TssLibMessageRequest;
  if (action === TssLibAction.BatchSize) {
    return {ruid, action, result: TssLib.batch_size()};
  }
  if (action === TssLibAction.RandomGenerator) {
    const {state} = payload;
    const result = TssLib.random_generator(state);
    return {ruid, action, result};
  }
  if (action === TssLibAction.RandomGeneratorFree) {
    const {rng} = payload;
    TssLib.random_generator_free(rng);
    return {ruid, action, result: 'done'};
  }
  if (action === TssLibAction.ThresholdSigner) {
    const {session, player_index, player_count, threshold, share, pubkey} =
      payload;
    try {
      const result = TssLib.threshold_signer(
        session,
        player_index,
        player_count,
        threshold,
        share,
        pubkey,
      );
      return {ruid, action, result};
    } catch (e) {
      return {ruid, action, error: e};
    }
  }
  if (action === TssLibAction.ThresholdSignerFree) {
    const {signer} = payload;
    TssLib.threshold_signer_free(signer);
    return {ruid, action, result: 'done'};
  }
  if (action === TssLibAction.Setup) {
    const {signer, rng} = payload;
    //result from setup not able to stringify
    await TssLib.setup(signer, rng);
    return {ruid, action, result: 'done'};
  }
  if (action === TssLibAction.Precompute) {
    const {parties, signer, rng} = payload;
    // conversion to Uint8Array needed as bridge transfer messed up Uint8Array
    const result = await TssLib.precompute(
      Uint8Array.from(parties),
      signer,
      rng,
    );
    return {ruid, action, result};
  }
  if (action === TssLibAction.LocalSign) {
    const {msg, hash_only, precompute} = payload;
    const result = TssLib.local_sign(msg, hash_only, precompute);
    return {ruid, action, result};
  }
  if (action === TssLibAction.GetRFromPrecompute) {
    const {precompute} = payload;
    const result = TssLib.get_r_from_precompute(precompute);
    return {ruid, action, result};
  }
  if (action === TssLibAction.LocalVerify) {
    const {msg, hash_only, r, sig_frags, pubkey} = payload;
    const result = TssLib.local_verify(msg, hash_only, r, sig_frags, pubkey);
    return {ruid, action, result};
  }
  if (action === TssLibAction.Sign) {
    const {counterparties, msg, hash_only, signer, rng} = payload;
    const result = await TssLib.sign(
      counterparties,
      msg,
      hash_only,
      signer,
      rng,
    );
    return {ruid, action, result};
  }

  return {ruid, action, result: 'unknown action'};
}

async function handleTssLibResponse(
  data: TssLibMessageResponse,
): Promise<TssLibMessageResponse> {
  const {action, result, ruid} = data;
  if (action === TssLibAction.JsSendMsg) {
    resolverMap.get(ruid + '-js_send_msg')(result);
    resolverMap.delete(ruid + '-js_send_msg');
    console.log('js_send_msg resolved', result);
    return {ruid, action, result: 'done'};
  }
  if (action === TssLibAction.JsReadMsg) {
    resolverMap.get(ruid + '-js_read_msg')(result);
    resolverMap.delete(ruid + '-js_read_msg');
    return {ruid, action, result: 'done'};
  }
}

const Root = () => {
  useNativeMessage(async (message: {type: string; data: any}) => {
    if (message.type === TssLibMessageType.TssLibRequest) {
      try {
        let result = await handleTssLib(message.data);
        emit({type: TssLibMessageType.TssLibResponse, data: result});
      } catch (e) {
        error({
          msg: `${message.type} error`,
          payload: message.data,
          error: e,
        });
      }
    }
    if (message.type === TssLibMessageType.TssLibResponse) {
      try {
        await handleTssLibResponse(message.data);
      } catch (e) {
        debug({type: 'handleTssLibResponse error', e});
        error({
          msg: `${message.type} error`,
          payload: message.data,
          error: e,
        });
      }
    }
  });

  bridgeEmit = emit;

  useEffect(() => {
    emit({type: 'tsslibInit', data: 'initializing'});
  }, []);

  return <div style={style} />;
};

export default webViewRender(<Root />);
