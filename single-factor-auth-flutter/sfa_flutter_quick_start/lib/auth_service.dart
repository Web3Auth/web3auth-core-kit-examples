import 'dart:io';

// IMP START - Auth Provider Login
import 'package:firebase_auth/firebase_auth.dart';
// IMP END - Auth Provider Login
import 'package:single_factor_auth_flutter/input.dart';
// IMP START - Quick Start
import 'package:single_factor_auth_flutter/single_factor_auth_flutter.dart';
// IMP END - Quick Start
import 'package:flutter/widgets.dart';

class AuthService extends ChangeNotifier {
  // IMP START - Auth Provider Login
  final FirebaseAuth _auth = FirebaseAuth.instance;
  // IMP END - Auth Provider Login
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
    // IMP START - Initialize Web3Auth SFA
    await SFA.init(Web3AuthNetwork(network: TorusNetwork.cyan));
    // IMP END - Initialize Web3Auth SFA
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
    // IMP START - Get Key
    return SFA.getKey(LoginParams(
        // IMP START - Verifier Creation
        verifier: 'web3auth-firebase-examples',
        // IMP END - Verifier Creation
        verifierId: 'sfa.flutter@w3a.link',
        idToken: token));
    // IMP END - Get Key
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

 // IMP START - Auth Provider Login
 // Get the current user
  User? getCurrentUser() {
    return _auth.currentUser;
  }
  // IMP END - Auth Provider Login


  Future<bool> isPrivateKeyAvailable() async {
    // IMP START - Auth Provider Login
    final User? user = _auth.currentUser;
    // IMP END - Auth Provider Login
    if (user != null) {
      // IMP START - Auth Provider Login
      final String? idToken = await user.getIdToken(true);
      // IMP END - Auth Provider Login
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
