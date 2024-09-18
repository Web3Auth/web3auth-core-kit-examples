import log, { LogLevelDesc } from "loglevel";
import React from "react";
import { StyleSheet, View } from "react-native";
import type { ReactNativeMessage } from "react-native-react-bridge";
import { useWebViewMessage } from "react-native-react-bridge";
import WebView from "react-native-webview";

import { TssLibAction, TssLibError, type TssLibMessageRequest, type TssLibMessageResponse, TssLibMessageType } from "./common";
// import webApp from "./WebApp";

// let promiseOn;
export let bridgeEmit: (message: ReactNativeMessage<any>) => void;

export const resolveMap = new Map<string, any>();
export const rejectMap = new Map<string, any>();

// resolve promise on response
const handleTssLibResponse = (data: TssLibMessageResponse) => {
  const { ruid, action, result } = data;
  // console.log('tssLib Result', ruid, action, result);
  const key = ruid + action;
  if (resolveMap.has(key)) {
    rejectMap.delete(key);
    resolveMap.get(key)(result);
    resolveMap.delete(key);
  } else {
    console.log("tssLib", "no resolver", key);
  }
};

const handleTssLibError = (data: TssLibMessageResponse) => {
  const { ruid, action, error } = data;
  const key = ruid + action;
  if (rejectMap.has(key)) {
    resolveMap.delete(key);
    rejectMap.get(key)(error);
    rejectMap.delete(key);
  }
};

// handle request from webview (js_send_msg, js_read_msg)
const handleTssLibRequest = async (data: TssLibMessageRequest) => {
  const { ruid, action, payload } = data;

  // console.log('tssLib Request from webview', ruid, action, payload);
  if (action === TssLibAction.JsReadMsg) {
    const { session, self_index, party, msg_type } = payload;
    const result = await (global as any).js_read_msg(session, self_index, party, msg_type);
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
    const { session, self_index, party, msg_type, msg_data } = payload;
    const result = await (global as any).js_send_msg(session, self_index, party, msg_type, msg_data);
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

export const Bridge = (params: { logLevel?: LogLevelDesc }) => {
  // useWebViewMessage hook create props for WebView and handle communication
  // The argument is callback to receive message from React
  log.setLevel(params.logLevel || "info");
  const { ref, onMessage, emit } = useWebViewMessage(async (message) => {
    if (message.type === "debug") {
      log.debug("debug", message.data);
    }

    // response handler
    if (message.type === TssLibMessageType.TssLibResponse) {
      handleTssLibResponse(message.data as TssLibMessageResponse);
    }
    if (message.type === TssLibMessageType.TssLibRequest) {
      await handleTssLibRequest(message.data as TssLibMessageRequest);
    }
    if (message.type === "error") {
      const { payload, error } = message.data as TssLibError;
      if (payload.ruid && payload.action) {
        handleTssLibError({ ...(payload as TssLibMessageResponse), error });
      } else {
        log.error("error", error);
      }
    }
    if (message.type === "state") {
      log.debug("tsslibInit", message.data);
    }
  });
  bridgeEmit = emit;

  return (
    <View style={styles.container}>
      <WebView
        // ref, source and onMessage must be passed to react-native-webview
        ref={ref}
        // Pass the source code of React app
        // source={{ html: webApp }}
        source={{ uri: "https://reactnative.dev/" }}
        onMessage={onMessage}
        onError={log.error}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 0,
    display: "none",
  },
});
