import 'dart:developer';

import 'package:auth0_flutter/auth0_flutter.dart';
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

  Future<SessionData> initialize() async {
    try {
      await singleFactorAuthFlutter.initialize();
      final sessionData = await singleFactorAuthFlutter.getSessionData();
      if (sessionData == null) {
        throw Exception("No session found");
      }
      return sessionData;
    } catch (e) {
      log("Error initializing SFA: $e");
      rethrow;
    }
  }

  Future<SessionData> loginWithAggregateVerifier(
    Credentials credentials,
    String subVerifier,
  ) async {
    try {
      final SessionData sessionData = await singleFactorAuthFlutter.connect(
        LoginParams(
          verifier: 'sfa-mobile-aggregate-verifier',
          verifierId: credentials.user.email!,
          idToken: credentials.idToken,
          subVerifierInfoArray: [
            TorusSubVerifierInfo(subVerifier, credentials.idToken)
          ],
        ),
      );

      return sessionData;
    } catch (e) {
      rethrow;
    }
  }
}
