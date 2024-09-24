import 'dart:developer';

import 'package:auth0_flutter/auth0_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:sfa_flutter_aggregate_example/core/auth0_helper.dart';
import 'package:sfa_flutter_aggregate_example/core/web3auth_sfa.dart';
import 'package:single_factor_auth_flutter/output.dart';

import "package:web3dart/credentials.dart" as web3;

enum LoginType { google, emailPasswordless }

class AppManager with ChangeNotifier {
  final Auth0Helper auth0helper;
  final Web3AuthSFA web3authSFA;

  late web3.Credentials _keyPair;
  late SFAKey _web3AuthSFAKey;
  bool _isLoggedIn = false;

  AppManager({
    required this.auth0helper,
    required this.web3authSFA,
  });

  bool get isLoggedIn => _isLoggedIn;
  web3.Credentials get keyPair => _keyPair;
  String get address => _keyPair.address.hex;
  String get privateKey => _web3AuthSFAKey.privateKey;

  Future<void> login(LoginType loginType) async {
    try {
      late final Credentials credentials;
      if (loginType == LoginType.google) {
        credentials = await auth0helper.signInWithGoogle();
        _web3AuthSFAKey = await web3authSFA.loginWithGoogle(
          credentials,
          "sfa-mobile-aggregate-auth0-google",
        );
      } else {
        credentials = await auth0helper.singInWithEmailPasswordless();
        _web3AuthSFAKey = await web3authSFA.loginWithGoogle(
          credentials,
          "sfa-mobile-aggregate-auth0-google",
        );
      }

      _keyPair = web3.EthPrivateKey.fromHex(_web3AuthSFAKey.privateKey);
      _isLoggedIn = true;
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> initialize() async {
    try {
      _web3AuthSFAKey = await web3authSFA.initialize();
      _keyPair = web3.EthPrivateKey.fromHex(_web3AuthSFAKey.privateKey);
      _isLoggedIn = true;
      notifyListeners();
    } catch (e) {
      log(e.toString());
    }
  }

  Future<void> logOut() async {
    await auth0helper.signOut();
    _isLoggedIn = false;
    notifyListeners();
  }
}
