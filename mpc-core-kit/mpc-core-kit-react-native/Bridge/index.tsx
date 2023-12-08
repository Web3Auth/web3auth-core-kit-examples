import React from 'react';
import WebView from 'react-native-webview';
import {Message, useWebViewMessage} from 'react-native-react-bridge';
import webApp from './WebApp';
import {View, StyleSheet} from 'react-native';
import {Button} from '@rneui/themed';
import {
  TssLibAction,
  TssLibMessageResponse,
  TssLibMessageRequest as TssLibMessageRequest,
  TssLibMessageType,
} from './common';

// let promiseOn;
export let bridgeEmit: (message: Message<any>) => void;

export const resolveMap = new Map<string, any>();
export const rejectMap = new Map<string, any>();

const handleTssLibMessage = async (data: TssLibMessageResponse) => {
  const {ruid, action, result} = data; //JSON.parse(message.data as string);
  console.log('tssLib Result', ruid, action, result);
  const key = ruid + action;
  if (resolveMap.has(key)) {
    resolveMap.get(key)(result);
    resolveMap.delete(key);
  } else {
    console.log('tssLib', 'no resolver', key);
  }
};

const handleTssLibRequest = async (data: TssLibMessageRequest) => {
  const {ruid, action, payload} = data; //JSON.parse(message.data as string);

  console.log('tssLib Request from webview', ruid, action, payload);
  const key = ruid + action;
  if (action === TssLibAction.JsReadMsg) {
    const {session, self_index, party, msg_type} = payload;
    const result = await global.js_read_msg(
      session,
      self_index,
      party,
      msg_type,
    );
    bridgeEmit({
      type: TssLibMessageType.TssLibResponse,
      data: {
        ruid,
        action,
        result,
      },
    });
    // need to add promise to resolveMap?
    console.log('done', action, result);
  } else if (action === TssLibAction.JsSendMsg) {
    const {session, self_index, party, msg_type, msg_data} = payload;
    const result = await global.js_send_msg(
      session,
      self_index,
      party,
      msg_type,
      msg_data,
    );
    bridgeEmit({
      type: TssLibMessageType.TssLibResponse,
      data: {
        ruid,
        action,
        result,
      },
    });
    console.log('done', action, result);
    // need to add promise to resolveMap?
  }
};

export const bridgeData = {
  data: '000',
};

export const emitTest = async () => {
  bridgeEmit({type: 'hello', data: 123});
  try {
    console.log('emitTest start');
    await new Promise((resolve, reject) => {
      resolveMap.set('hello', resolve);
      rejectMap.set('hello', reject);
    });
  } catch (error) {
    throw error;
  }
  rejectMap.delete('hello');
  resolveMap.delete('hello');
  console.log('emitTest done');
};
export const Bridge = () => {
  // useWebViewMessage hook create props for WebView and handle communication
  // The argument is callback to receive message from React
  const {ref, onMessage, emit} = useWebViewMessage(async message => {
    console.log('message', message);
    if (message.type === 'hello-send') {
      console.log('hello-send');
      emit({type: 'hello-send', data: 123});
    }
    if (message.type === 'hello-done') {
      console.log('hello-done');
      resolveMap.get('hello')();
    }

    if (message.type === 'debug') {
      console.log('debug', message.data);
    }

    // response handler
    if (message.type === TssLibMessageType.TssLibResponse) {
      handleTssLibMessage(message.data as TssLibMessageResponse);
    }
    if (message.type === TssLibMessageType.TssLibRequest) {
      await handleTssLibRequest(message.data as TssLibMessageRequest);
    }
    if (message.type === 'error') {
      console.log('error', message.data);
      // rejectMap.get(message.data.ruid + message.data.action)(
    }
    bridgeData.data = message.data as string;
  });
  bridgeEmit = emit;

  async function send() {
    console.log('send======================');
    emit({type: 'hello', data: 123});
    // await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('send2');
    // emit({type: 'hello', data: 123});

    return null;
  }
  return (
    <View style={styles.container}>
      <WebView
        // ref, source and onMessage must be passed to react-native-webview
        ref={ref}
        // Pass the source code of React app
        source={{html: webApp}}
        onMessage={onMessage}
        onError={console.log}
      />

      <Button title="send with Web3Auth" onPress={send} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 0,
    display: 'none',
  },
});
