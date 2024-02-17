import 'dart:developer';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

class FirebaseAuthHelper {
  final FirebaseAuth _auth;

  FirebaseAuthHelper({required FirebaseAuth auth}) : _auth = auth;

  Future<UserCredential> signInWithGoogle() async {
    try {
      return await _auth.signInWithProvider(GoogleAuthProvider());
    } catch (e, _) {
      log(e.toString());
      rethrow;
    }
  }

  Future<void> signOut(BuildContext context) async {
    await _auth.signOut();
  }

  User? getCurrentUser() {
    return _auth.currentUser;
  }
}
