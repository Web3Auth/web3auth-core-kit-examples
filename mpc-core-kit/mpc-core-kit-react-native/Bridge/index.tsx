import React from 'react';
import WebView from 'react-native-webview';
import {Message, useWebViewMessage} from 'react-native-react-bridge';
import webApp from './WebApp';
import {View, StyleSheet} from 'react-native';
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

// resolve promise on response
const handleTssLibResponse = (data: TssLibMessageResponse) => {
  const {ruid, action, result} = data;
  // console.log('tssLib Result', ruid, action, result);
  const key = ruid + action;
  if (resolveMap.has(key)) {
    resolveMap.get(key)(result);
    resolveMap.delete(key);
  } else {
    console.log('tssLib', 'no resolver', key);
  }
};

// handle request from webview (js_send_msg, js_read_msg)
const handleTssLibRequest = async (data: TssLibMessageRequest) => {
  const {ruid, action, payload} = data;

  // console.log('tssLib Request from webview', ruid, action, payload);
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
    // console.log('done', action, result);
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
    // need to add promise to resolveMap?
    // console.log('done', action, result);
  }
};

export const Bridge = () => {
  // useWebViewMessage hook create props for WebView and handle communication
  // The argument is callback to receive message from React
  const {ref, onMessage, emit} = useWebViewMessage(async message => {
    if (message.type === 'debug') {
      console.log('debug', message.data);
    }

    // response handler
    if (message.type === TssLibMessageType.TssLibResponse) {
      handleTssLibResponse(message.data as TssLibMessageResponse);
    }
    if (message.type === TssLibMessageType.TssLibRequest) {
      await handleTssLibRequest(message.data as TssLibMessageRequest);
    }
    if (message.type === 'error') {
      console.log('error', message.data);
      // rejectMap.get(message.data.ruid + message.data.action)(
    }
  });
  bridgeEmit = emit;

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 0,
    display: 'none',
  },
});
