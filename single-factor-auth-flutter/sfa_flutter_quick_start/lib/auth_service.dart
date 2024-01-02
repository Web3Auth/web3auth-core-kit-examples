import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:single_factor_auth_flutter/input.dart';
import 'package:single_factor_auth_flutter/single_factor_auth_flutter.dart';
import 'package:flutter/widgets.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final SFA = SingleFactAuthFlutter();

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  AuthService() {
    initSdk();
  }

  Future<void> initSdk() async {
    if (Platform.isAndroid) {
      await init();
      initialize();
    } else if (Platform.isIOS) {
      init();
      initialize();
    } else {}
  }

  Future<void> init() async {
    await SFA.init(Web3AuthNetwork(network: TorusNetwork.cyan));
  }

  Future<void> initialize() async {
    print("initialize() called");
    try {
      final String privKey = await SFA.initialize();
      if (privKey.isNotEmpty) {
        print('Initialized successfully. Private Key: $privKey');
      }
    } catch (e) {
      print("Error initializing SFA: $e");
    }
  }

  Future<String> getKey(String token) {
    return SFA.getKey(LoginParams(
        verifier: 'web3auth-firebase-examples',
        verifierId: 'sfa.flutter@w3a.link',
        idToken: token));
  }

  // Sign in with email and password
  Future<UserCredential> signInWithEmailAndPassword(
      String email, String password) async {
    try {
      await initSdk(); // Ensure the SDK is initialized
      return await _auth.signInWithEmailAndPassword(
          email: email, password: password);
    } catch (e) {
      print(e.toString());
      rethrow;
    }
  }

  // Sign out
  Future<void> signOut() async {
    await _auth.signOut();
  }

  // Get the current user
  User? getCurrentUser() {
    return _auth.currentUser;
  }

  Future<bool> isPrivateKeyAvailable() async {
    final User? user = _auth.currentUser;
    if (user != null) {
      final String? idToken = await user.getIdToken(true);
      final String privateKey = await getKey(idToken!);
      print(privateKey);
      return privateKey.isNotEmpty;
    } else {
      return false;
    }
  }

  Future<String> getPrivateKey() async {
    final User? user = _auth.currentUser;
    if (user != null) {
      final String? idToken = await user.getIdToken(true);
      return await getKey(idToken!);
    } else {
      return '';
    }
  }
}
