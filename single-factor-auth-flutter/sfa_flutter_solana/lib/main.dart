import 'dart:developer';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:sfa_flutter_solana/core/firebase_auth_helper.dart';
import 'package:sfa_flutter_solana/core/service_locator.dart';
import 'package:sfa_flutter_solana/core/web3auth_sfa.dart';
import 'package:sfa_flutter_solana/home_screen.dart';
import 'package:sfa_flutter_solana/login_screen.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await ServiceLocator.init();
  await ServiceLocator.getIt<Web3AuthSFA>().init();
  await ServiceLocator.getIt<Web3AuthSFA>().initialize();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SFA Flutter Solana',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue.shade400),
      ),
      home: const AuthenticationWrapper(),
    );
  }
}

class AuthenticationWrapper extends StatefulWidget {
  const AuthenticationWrapper({super.key});

  @override
  State<AuthenticationWrapper> createState() => _AuthenticationWrapperState();
}

class _AuthenticationWrapperState extends State<AuthenticationWrapper> {
  late FirebaseAuthHelper firebaseHelper;

  @override
  void initState() {
    super.initState();
    firebaseHelper = ServiceLocator.getIt<FirebaseAuthHelper>();
    ServiceLocator.getIt<Web3AuthSFA>()
        .singleFactorAuthFlutter
        .connected()
        .then((value) {
      log("Connected: $value");
    });
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.active) {
          final User? user = snapshot.data;
          if (user == null) {
            return const LoginScreen();
          } else {
            return const HomeScreen();
          }
        }
        return const CircularProgressIndicator();
      },
    );
  }
}
