import 'package:firebase_auth/firebase_auth.dart';
import 'package:get_it/get_it.dart';
import 'package:sfa_flutter_solana/core/firebase_auth_helper.dart';
import 'package:sfa_flutter_solana/core/solana/solana_provider.dart';
import 'package:sfa_flutter_solana/core/web3auth_sfa.dart';
import 'package:single_factor_auth_flutter/single_factor_auth_flutter.dart';
import 'package:solana/solana.dart';

class ServiceLocator {
  ServiceLocator._();

  static GetIt get getIt => GetIt.instance;

  static Future<void> init() async {
    final singleFactorAuth = SingleFactorAuthFlutter();

    getIt.registerLazySingleton<SingleFactorAuthFlutter>(() => singleFactorAuth);
    getIt.registerLazySingleton<Web3AuthSFA>(() => Web3AuthSFA(getIt()));
    getIt.registerLazySingleton<FirebaseAuthHelper>(
      () => FirebaseAuthHelper(auth: FirebaseAuth.instance),
    );

    final solanaClient = SolanaClient(
      rpcUrl: Uri.parse('https://api.devnet.solana.com'),
      websocketUrl: Uri.parse('ws://api.devnet.solana.com'),
    );

    getIt.registerLazySingleton<SolanaClient>(() => solanaClient);
    getIt.registerLazySingleton(() => SolanaProvider(getIt()));
  }
}
