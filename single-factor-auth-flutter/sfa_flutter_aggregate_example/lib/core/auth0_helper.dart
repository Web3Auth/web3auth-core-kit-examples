import 'dart:developer';

import 'package:auth0_flutter/auth0_flutter.dart';

class Auth0Helper {
  final Auth0 _auth0;

  Auth0Helper(Auth0 auth0) : _auth0 = auth0;

  Future<Credentials> signInWithGoogle() async {
    try {
      return await _auth0
          .webAuthentication(scheme: 'w3a')
          .login(parameters: {"connection": "google-oauth2"});
    } catch (e, _) {
      log(e.toString());
      rethrow;
    }
  }

  Future<Credentials> singInWithEmailPasswordless() async {
    try {
      return await _auth0.webAuthentication(scheme: 'w3a').login();
    } catch (e, _) {
      log(e.toString());
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _auth0.webAuthentication().logout(
        returnTo:
            "w3a://web3auth.au.auth0.com/android/com.example.sfa_flutter_aggregate_example/callback");
  }

  Future<Credentials> getCredentials() async {
    return await _auth0.api.renewCredentials(
        refreshToken:
            (await _auth0.credentialsManager.credentials()).refreshToken!);
  }
}
