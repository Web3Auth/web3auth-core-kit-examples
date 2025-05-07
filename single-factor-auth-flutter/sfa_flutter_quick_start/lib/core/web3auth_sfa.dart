import 'dart:developer';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:single_factor_auth_flutter/enums.dart';
import 'package:single_factor_auth_flutter/input.dart';
import 'package:single_factor_auth_flutter/output.dart';
// IMP START - Quick Start
import 'package:single_factor_auth_flutter/single_factor_auth_flutter.dart';

// IMP END - Quick Start
class Web3AuthSFA {
  final SingleFactorAuthFlutter singleFactorAuthFlutter;

  Web3AuthSFA(this.singleFactorAuthFlutter);

  Future<void> init() async {
    // IMP START - Initialize Web3Auth SFA
    await singleFactorAuthFlutter.init(
      Web3AuthOptions(
        network: Web3AuthNetwork.mainnet,
        clientId:
            "BJRZ6qdDTbj6Vd5YXvV994TYCqY42-PxldCetmvGTUdoq6pkCqdpuC1DIehz76zuYdaq1RJkXGHuDraHRhCQHvA",
        redirectUrl: 'com.example.sfa_flutter_quick_start',
      ),
    );
    // IMP END - Initialize Web3Auth SFA
  }

  Future<void> initialize() async {
    try {
      await singleFactorAuthFlutter.initialize();
      final sessionData = await singleFactorAuthFlutter.getSessionData();
      if (sessionData != null) {
        log('Initialized successfully. Private Key: ${sessionData.privateKey}');
      }
    } catch (e) {
      log("Error initializing SFA: $e");
    }
  }

  Future<void> showWalletUI() async {
    try {
      final chainConfig = ChainConfig(
        chainId: '0xaa36a7',
        rpcTarget: 'https://1rpc.io/sepolia',
      );
      await singleFactorAuthFlutter.showWalletUI(chainConfig);
    } catch (e) {
      log("Error showing wallet UI: $e");
    }
  }

  Future<void> showTransactionUI() async {
    try {
      final chainConfig = ChainConfig(
        chainId: '0xaa36a7',
        rpcTarget: 'https://1rpc.io/sepolia',
      );

      final sessionData = await singleFactorAuthFlutter.getSessionData();
      final result =
          await singleFactorAuthFlutter.request(chainConfig, "personal_sign", [
        "Hello, Web3Auth from Flutter SFA!",
        sessionData!.publicAddress,
      ]);

      log("Transaction result: $result");
    } catch (e) {
      log("Error showing wallet UI: $e");
    }
  }

  Future<SessionData> getKey(User user) async {
    // IMP START - Get Key
    try {
      final token = await user.getIdToken(true);
      final SessionData sessionData = await singleFactorAuthFlutter.connect(
        LoginParams(
          // IMP START - Verifier Creation
          verifier: 'w3a-firebase-demo',
          // IMP END - Verifier Creation
          verifierId: user.uid,
          idToken: token!,
        ),
      );

      return sessionData;
    } catch (e) {
      rethrow;
    }
    // IMP END - Get Key
  }
}
