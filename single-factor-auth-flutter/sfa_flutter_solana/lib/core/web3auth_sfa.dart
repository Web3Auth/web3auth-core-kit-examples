import 'dart:developer';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:single_factor_auth_flutter/enums.dart';
import 'package:single_factor_auth_flutter/input.dart';
import 'package:single_factor_auth_flutter/output.dart';
import 'package:single_factor_auth_flutter/single_factor_auth_flutter.dart';

class Web3AuthSFA {
  final SingleFactorAuthFlutter singleFactorAuthFlutter;

  Web3AuthSFA(this.singleFactorAuthFlutter);

  Future<void> init() async {
    await singleFactorAuthFlutter.init(
      Web3AuthOptions(
        network: Web3AuthNetwork.sapphire_mainnet,
        clientId:
            "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
      ),
    );
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

  Future<SessionData> getKey(User user) async {
    try {
      final token = await user.getIdToken(true);

      final SessionData sessionData = await singleFactorAuthFlutter.connect(
        LoginParams(
          verifier: 'w3a-firebase-demo',
          verifierId: user.uid,
          idToken: token!,
        ),
      );

      return sessionData;
    } catch (e) {
      rethrow;
    }
  }
}
