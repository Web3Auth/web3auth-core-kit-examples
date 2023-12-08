export enum TssLibAction {
  BatchSize = 'batch_size',
  RandomGenerator = 'random_generator',
  RandomGeneratorFree = 'random_generator_free',
  ThresholdSigner = 'threshold_signer',
  ThresholdSignerFree = 'threshold_signer_free',
  Setup = 'setup',
  Precompute = 'precompute',
  LocalSign = 'local_sign',
  GetRFromPrecompute = 'get_r_from_precompute',
  LocalVerify = 'local_verify',
  Sign = 'sign',

  JsSendMsg = 'js_send_msg',
  JsReadMsg = 'js_read_msg',
  JsSendMsgDone = 'js_send_msg_done',
  JsReadMsgDone = 'js_read_msg_done',
}

export enum TssLibMessageType {
  TssLibRequest = 'tssLibRequest',
  TssLibResponse = 'tssLibResponse',
}

export type TssLibMessageResponse = {
  ruid: string;
  action: string;
  result?: any;
  error?: any;
};

export type TssLibMessageRequest = {
  ruid: string;
  action: string;
  payload: any;
};
