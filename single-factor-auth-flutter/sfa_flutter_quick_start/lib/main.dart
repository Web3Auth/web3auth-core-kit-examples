import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:sfa_flutter_quick_start/core/firebase.dart';
import 'package:sfa_flutter_quick_start/core/service_locator.dart';
import 'package:sfa_flutter_quick_start/core/web3auth_sfa.dart';
import 'package:sfa_flutter_quick_start/home_page.dart';
import 'package:sfa_flutter_quick_start/login_page.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await ServiceLocator.init();
  final Web3AuthSFA web3authSFA = ServiceLocator.getIt<Web3AuthSFA>();
  web3authSFA.init();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SFA Flutter Quick Start',
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
  late FirebaseHelper firebaseHelper;

  @override
  void initState() {
    super.initState();
    firebaseHelper = ServiceLocator.getIt<FirebaseHelper>();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.active) {
          final User? user = snapshot.data;
          if (user == null) {
            return const LoginPage();
          } else {
            return const HomePage();
          }
        }
        return const CircularProgressIndicator();
      },
    );
  }
}
