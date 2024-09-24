import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:sfa_flutter_aggregate_example/core/app_manager.dart';
import 'package:sfa_flutter_aggregate_example/core/ethereum_provider.dart';
import 'package:sfa_flutter_aggregate_example/core/extensions.dart';
import 'package:sfa_flutter_aggregate_example/core/widgets/custom_dialog.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final AppManager appManager;
  late final ValueNotifier<bool> isAccountLoaded;
  late final EthereumProvider ethereumProvider;
  late String balance;

  @override
  void initState() {
    super.initState();
    appManager = Provider.of<AppManager>(context, listen: false);
    isAccountLoaded = ValueNotifier<bool>(false);
    ethereumProvider = EthereumProvider(appManager.keyPair);
    loadAccount(context);
  }

  Future<void> loadAccount(BuildContext context) async {
    try {
      balance = await ethereumProvider.getBalance(appManager.address);
      isAccountLoaded.value = true;
    } catch (e, _) {
      if (context.mounted) {
        showInfoDialog(context, e.toString());
      }
    }
  }

  Future<void> refreshBalance(BuildContext context) async {
    try {
      isAccountLoaded.value = false;
      balance = await ethereumProvider.getBalance(appManager.address);
      isAccountLoaded.value = true;
    } catch (e, _) {
      if (context.mounted) {
        showInfoDialog(context, e.toString());
      }
    }
  }

  Widget get verticalGap => const SizedBox(height: 16);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.logout),
          onPressed: () {
            logOut(context);
          },
        ),
      ),
      body: ValueListenableBuilder<bool>(
        valueListenable: isAccountLoaded,
        builder: (context, isLoaded, _) {
          if (isLoaded) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    balance.toString(),
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  verticalGap,
                  Text(
                    'Ethereum Sepolia\nRequest the faucet on alchemy.com/faucets/ethereum-sepolia',
                    style: Theme.of(context).textTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                  verticalGap,
                  Text(
                    "userName",
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  Row(
                    children: [
                      const Spacer(),
                      Text(
                        appManager.address.addressAbbreviation,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(
                        width: 4,
                      ),
                      IconButton(
                        onPressed: () {
                          copyContentToClipboard(context, appManager.address);
                        },
                        icon: const Icon(Icons.copy),
                      ),
                      const Spacer(),
                    ],
                  ),
                  verticalGap,
                  OutlinedButton(
                    onPressed: () {
                      selfTransfer(context);
                    },
                    child: const Text(
                      "Self transfer 0.0001 ETH",
                    ),
                  ),
                  verticalGap,
                  OutlinedButton(
                    onPressed: () {
                      signSelfTransfer(context);
                    },
                    child: const Text(
                      "Sign Message",
                    ),
                  ),
                  verticalGap,
                  OutlinedButton(
                    onPressed: () async {
                      final privateKey = appManager.privateKey;
                      if (context.mounted) {
                        copyContentToClipboard(context, privateKey);
                      }
                    },
                    child: const Text(
                      "Show private key",
                    ),
                  ),
                ],
              ),
            );
          }
          return const Center(child: CircularProgressIndicator.adaptive());
        },
      ),
    );
  }

  void copyContentToClipboard(BuildContext context, String content) {
    Clipboard.setData(
      ClipboardData(text: content),
    );

    showInfoDialog(context, "Copied to clipboard\n\n$content");
  }

  Future<void> signSelfTransfer(BuildContext context) async {
    showLoader(context);
    try {
      final signedMessage = await ethereumProvider.signMessage(
        "Aggregate Example",
      );

      if (context.mounted) {
        removeDialog(context);
        showInfoDialog(context, "Signed message\n$signedMessage");
      }
    } catch (e, _) {
      if (context.mounted) {
        removeDialog(context);
        showInfoDialog(context, e.toString());
      }
    }
  }

  Future<void> selfTransfer(BuildContext context) async {
    showLoader(context);
    try {
      final hash = await ethereumProvider.sendTransaction(
        appManager.address,
        0.0001,
      );
      if (context.mounted) {
        removeDialog(context);
        showInfoDialog(context, "Success: $hash");
        refreshBalance(context);
      }
    } catch (e, _) {
      if (context.mounted) {
        removeDialog(context);
        showInfoDialog(context, e.toString());
      }
    }
  }

  Future<void> logOut(BuildContext context) async {
    try {
      await appManager.logOut();
    } catch (e, _) {
      if (context.mounted) {
        showInfoDialog(context, e.toString());
      }
    }
  }

  String getUserDisplayName() {
    // if (credentials.displayName != null &&
    //     credentials.displayName!.isNotEmpty) {
    //   return credentials.displayName!;
    // } else if (credentials.email != null && credentials.email!.isNotEmpty) {
    //   return credentials.email!;
    // }
    return 'User';
  }
}
