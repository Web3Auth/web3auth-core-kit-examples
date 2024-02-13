import 'dart:developer';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

class FirebaseHelper {
  final FirebaseAuth _auth;

  FirebaseHelper({required FirebaseAuth auth}) : _auth = auth;

  // Sign in with email and password
  Future<UserCredential> signInWithEmailAndPassword(
    String email,
    String password,
  ) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } catch (e) {
      log(e.toString());
      rethrow;
    }
  }

  // Sign out
  Future<void> signOut(BuildContext context) async {
    await _auth.signOut();
  }

  // IMP START - Auth Provider Login
  // Get the current user
  User? getCurrentUser() {
    return _auth.currentUser;
  }
  // IMP END - Auth Provider Login
}
