import 'package:firebase_auth/firebase_auth.dart';
import 'package:get_it/get_it.dart';
import 'package:sfa_flutter_quick_start/core/firebase.dart';
import 'package:sfa_flutter_quick_start/core/web3auth_sfa.dart';
import 'package:single_factor_auth_flutter/single_factor_auth_flutter.dart';

class ServiceLocator {
  ServiceLocator._();

  static GetIt get getIt => GetIt.instance;

  static Future<void> init() async {
    final singleFactorAuth = SingleFactorAuthFlutter();

    getIt.registerLazySingleton<SingleFactorAuthFlutter>(() => singleFactorAuth);
    getIt.registerLazySingleton<Web3AuthSFA>(() => Web3AuthSFA(getIt()));

    getIt.registerLazySingleton(
      () => FirebaseHelper(auth: FirebaseAuth.instance),
    );
  }
}
