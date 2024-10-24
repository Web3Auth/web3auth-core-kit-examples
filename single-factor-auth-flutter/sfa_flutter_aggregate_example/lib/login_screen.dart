import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:sfa_flutter_aggregate_example/core/app_manager.dart';
import 'package:sfa_flutter_aggregate_example/core/widgets/custom_dialog.dart';
import 'package:provider/provider.dart';

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
                "SFA Flutter Aggregate Sample",
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  _onSignIn(context, LoginType.google);
                },
                child: const Text('Sign In With Google'),
              ),
              ElevatedButton(
                onPressed: () {
                  _onSignIn(context, LoginType.emailPasswordless);
                },
                child: const Text('Sign In With Email Passwordless'),
              )
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _onSignIn(BuildContext context, LoginType loginType) async {
    showLoader(context);
    try {
      context.read<AppManager>().login(loginType);
      removeDialog(context);
    } catch (e) {
      log('Error signing in: $e');
      if (context.mounted) {
        Navigator.of(context).pop();
        showInfoDialog(context, e.toString());
      }
    }
  }
}
