import 'dart:developer';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:single_factor_auth_flutter/input.dart';
import 'package:single_factor_auth_flutter/output.dart';
// IMP START - Quick Start
import 'package:single_factor_auth_flutter/single_factor_auth_flutter.dart';
// IMP END - Quick Start
class Web3AuthSFA {
  final SingleFactAuthFlutter singleFactAuthFlutter;

  Web3AuthSFA(this.singleFactAuthFlutter);

  Future<void> init() async {
    // IMP START - Initialize Web3Auth SFA
    await singleFactAuthFlutter.init(
      Web3AuthNetwork(network: TorusNetwork.cyan),
    );
    // IMP END - Initialize Web3Auth SFA
  }

  Future<void> initialize() async {
    try {
      final TorusKey? torusKey = await singleFactAuthFlutter.initialize();
      if (torusKey != null) {
        log('Initialized successfully. Private Key: ${torusKey.privateKey}');
      }
    } catch (e) {
      log("Error initializing SFA: $e");
    }
  }

  Future<TorusKey> getKey(User user) async {
    // IMP START - Get Key
    try {
      final token = await user.getIdToken(true);
      final TorusKey torusKey = await singleFactAuthFlutter.getKey(
        LoginParams(
          // IMP START - Verifier Creation
          verifier: 'web3auth-firebase-examples',
          // IMP END - Verifier Creation
          verifierId: 'sfa.flutter@w3a.link',
          idToken: token!,
        ),
      );

      return torusKey;
    } catch (e) {
      rethrow;
    }
    // IMP END - Get Key
  }
}
