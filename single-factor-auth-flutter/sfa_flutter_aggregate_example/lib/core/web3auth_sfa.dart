import 'dart:developer';

import 'package:auth0_flutter/auth0_flutter.dart';
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

  Future<SFAKey> initialize() async {
    try {
      final SFAKey? sfaKey = await singleFactAuthFlutter.initialize();
      return sfaKey!;
    } catch (e) {
      log("Error initializing SFA: $e");
      rethrow;
    }
  }

  Future<SFAKey> loginWithGoogle(
    Credentials credentials,
    String subVerifier,
  ) async {
    try {
      final SFAKey sfaKey = await singleFactAuthFlutter.connect(
        LoginParams(
          verifier: subVerifier,
          verifierId: credentials.user.email!,
          idToken: credentials.idToken,
          aggregateVerifier: 'sfa-mobile-aggregate-verifier',
        ),
      );

      return sfaKey;
    } catch (e) {
      rethrow;
    }
  }
}
