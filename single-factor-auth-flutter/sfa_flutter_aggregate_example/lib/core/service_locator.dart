import 'package:auth0_flutter/auth0_flutter.dart';
import 'package:get_it/get_it.dart';
import 'package:sfa_flutter_aggregate_example/core/auth0_helper.dart';
import 'package:sfa_flutter_aggregate_example/core/web3auth_sfa.dart';
import 'package:single_factor_auth_flutter/single_factor_auth_flutter.dart';
class ServiceLocator {
  ServiceLocator._();

  static GetIt get getIt => GetIt.instance;

  static Future<void> init() async {
    final singleFactorAuth = SingleFactorAuthFlutter();

    getIt.registerLazySingleton<SingleFactorAuthFlutter>(() => singleFactorAuth);
    getIt.registerLazySingleton<Web3AuthSFA>(() => Web3AuthSFA(getIt()));
    getIt.registerLazySingleton<Auth0>(
      () => Auth0("web3auth.au.auth0.com", "hUVVf4SEsZT7syOiL0gLU9hFEtm2gQ6O"),
    );
    getIt.registerLazySingleton<Auth0Helper>(
      () => Auth0Helper(getIt()),
    );
  }
}
