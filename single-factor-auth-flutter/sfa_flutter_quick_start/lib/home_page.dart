import 'dart:developer';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:sfa_flutter_quick_start/core/firebase.dart';
import 'package:sfa_flutter_quick_start/core/service_locator.dart';
import 'package:sfa_flutter_quick_start/core/web3auth_sfa.dart';
import 'package:sfa_flutter_quick_start/core/widgets/custom_dialog.dart';
import 'package:single_factor_auth_flutter/output.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final FirebaseHelper firebaseHelper;
  late final Web3AuthSFA web3authSFA;
  late final User user;
  late final String userName;

  @override
  void initState() {
    super.initState();
    firebaseHelper = ServiceLocator.getIt<FirebaseHelper>();
    web3authSFA = ServiceLocator.getIt<Web3AuthSFA>();
    user = firebaseHelper.getCurrentUser()!;
    userName = getUserDisplayName();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home Page'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Welcome, $userName',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              FutureBuilder<SessionData>(
                future: web3authSFA.getKey(user),
                builder: (
                  BuildContext context,
                  AsyncSnapshot<SessionData> snapshot,
                ) {
                  switch (snapshot.connectionState) {
                    case ConnectionState.none:
                    case ConnectionState.waiting:
                      return const CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
                      );
                    case ConnectionState.done:
                      if (snapshot.hasError) {
                        log(snapshot.error.toString());
                        return Text('Error: ${snapshot.error}');
                      }

                      final String privateKey = snapshot.data!.privateKey;
                      final String publicAddress = snapshot.data!.publicAddress;

                      return Column(
                        children: [
                          Text(
                            publicAddress,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () {
                              showInfoDialog(
                                context,
                                'Private Key\n$privateKey',
                              );
                            },
                            child: const Text('Get private key'),
                          ),
                        ],
                      );
                    default:
                      return const Text('Something went wrong.');
                  }
                },
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  // Use the AuthService class to handle sign out
                  firebaseHelper.signOut(context);
                },
                child: const Text('Sign Out'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String getUserDisplayName() {
    if (user.displayName != null && user.displayName!.isNotEmpty) {
      return user.displayName!;
    } else if (user.email != null && user.email!.isNotEmpty) {
      return user.email!;
    }
    return 'User';
  }
}
