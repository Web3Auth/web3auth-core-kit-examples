import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:sfa_flutter_quick_start/core/firebase.dart';
import 'package:sfa_flutter_quick_start/core/service_locator.dart';
import 'package:sfa_flutter_quick_start/core/widgets/custom_dialog.dart';
import 'package:sfa_flutter_quick_start/home_page.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

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
    final firebaseHelper = ServiceLocator.getIt<FirebaseHelper>();
    showLoader(context);

    try {
      final userCredential = await firebaseHelper.signInWithEmailAndPassword(
        'sfa.flutter@w3a.link',
        'Testing@123',
      );

      log('User: ${userCredential.user.toString()}');

      if (context.mounted) {
        Navigator.of(context).pop();
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) {
            return const HomePage();
          }),
        );
      }
    } catch (e) {
      log('Error signing in: $e');
      if (context.mounted) {
        showInfoDialog(context, e.toString());
      }
    }
  }
}
