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
      SFAParams(
        network: Web3AuthNetwork.mainnet,
        clientid:
            "BJRZ6qdDTbj6Vd5YXvV994TYCqY42-PxldCetmvGTUdoq6pkCqdpuC1DIehz76zuYdaq1RJkXGHuDraHRhCQHvA",
      ),
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
          verifier: 'w3a-firebase-demo',
          // IMP END - Verifier Creation
          verifierId: user.uid,
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
