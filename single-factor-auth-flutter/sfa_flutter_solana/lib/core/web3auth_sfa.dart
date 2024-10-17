import 'dart:developer';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:single_factor_auth_flutter/input.dart';
import 'package:single_factor_auth_flutter/output.dart';
import 'package:single_factor_auth_flutter/single_factor_auth_flutter.dart';

class Web3AuthSFA {
  final SingleFactAuthFlutter singleFactAuthFlutter;

  Web3AuthSFA(this.singleFactAuthFlutter);

  Future<void> init() async {
    await singleFactAuthFlutter.init(
      SFAParams(
        network: Web3AuthNetwork.sapphire_mainnet,
        clientId:
            "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
      ),
    );
  }

  Future<void> initialize() async {
    try {
      final SFAKey? torusKey = await singleFactAuthFlutter.initialize();
      if (torusKey != null) {
        log('Initialized successfully. Private Key: ${torusKey.privateKey}');
      }
    } catch (e) {
      log("Error initializing SFA: $e");
    }
  }

  Future<SFAKey> getKey(User user) async {
    try {
      final token = await user.getIdToken(true);

      final SFAKey torusKey = await singleFactAuthFlutter.connect(
        LoginParams(
          verifier: 'w3a-firebase-demo',
          verifierId: user.uid,
          idToken: token!,
        ),
      );

      return torusKey;
    } catch (e) {
      rethrow;
    }
  }
}
