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
        network: Web3AuthNetwork.cyan,
        clientid: "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk",
      ),
    );
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
    try {
      final token = await user.getIdToken(true);

      final TorusKey torusKey = await singleFactAuthFlutter.getKey(
        LoginParams(
          verifier: 'w3a-sfa-flutter-google',
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
