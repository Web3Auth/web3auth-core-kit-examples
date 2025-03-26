import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sfa_flutter_aggregate_example/core/app_manager.dart';
import 'package:sfa_flutter_aggregate_example/core/auth0_helper.dart';
import 'package:sfa_flutter_aggregate_example/core/service_locator.dart';
import 'package:sfa_flutter_aggregate_example/core/web3auth_sfa.dart';
import 'package:sfa_flutter_aggregate_example/core/widgets/custom_dialog.dart';
import 'package:sfa_flutter_aggregate_example/home_screen.dart';
import 'package:sfa_flutter_aggregate_example/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ServiceLocator.init();
  await ServiceLocator.getIt<Web3AuthSFA>().init();
  await ServiceLocator.getIt<Web3AuthSFA>().initialize();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (context) => AppManager(
            auth0helper: ServiceLocator.getIt<Auth0Helper>(),
            web3authSFA: ServiceLocator.getIt<Web3AuthSFA>(),
          ),
        ),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SFA Flutter Aggregate',
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
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      initializeApp(context);
    });
  }

  Future<void> initializeApp(BuildContext context) async {
    showLoader(context);
    await context.read<AppManager>().initialize();
    if (context.mounted) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!context.watch<AppManager>().isLoggedIn) {
      return const LoginScreen();
    } else {
      return const HomeScreen();
    }
  }
}
