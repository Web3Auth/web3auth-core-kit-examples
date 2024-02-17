import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:sfa_flutter_solana/core/firebase_auth_helper.dart';
import 'package:sfa_flutter_solana/core/service_locator.dart';
import 'package:sfa_flutter_solana/core/widgets/custom_dialog.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Login'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "SFA Flutter Solana Sample",
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  _onSignIn(context);
                },
                child: const Text('Sign In'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _onSignIn(BuildContext context) async {
    final firebaseHelper = ServiceLocator.getIt<FirebaseAuthHelper>();

    try {
      final userCredential = await firebaseHelper.signInWithGoogle();

      log('User: ${userCredential.user.toString()}');
    } catch (e) {
      log('Error signing in: $e');
      if (context.mounted) {
        Navigator.of(context).pop();
        showInfoDialog(context, e.toString());
      }
    }
  }
}
