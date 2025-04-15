import 'dart:math';
import 'dart:typed_data';

import 'package:web3dart/crypto.dart';
import 'package:web3dart/web3dart.dart';
import 'package:http/http.dart';

class EthereumProvider {
  final Web3Client web3client;
  final Credentials _credentials;

  EthereumProvider(
    this._credentials, {
    String rpcTarget = "https://api.web3auth.io/infura-service/v1/11155111/BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
  }) : web3client = Web3Client(
          rpcTarget,
          Client(),
        );

  Future<String> getBalance(String address) async {
    final balance = await web3client.getBalance(
      EthereumAddress.fromHex(address),
    );

    // The result we get from Web3Client is in wei, the smallest value. To convert
    // the value to ether, you can divide it with 10^18, where 18 denotes the
    // decimals for wei.
    //
    // For the sample, we'll use a helper function from web3dart package which
    // has the same implementation.
    return balance.getValueInUnit(EtherUnit.ether).toStringAsFixed(6);
  }

  Future<String> sendTransaction(String to, double amount) async {
    final amountInWei = amount * pow(10, 18);
    final Transaction transaction = Transaction(
      to: EthereumAddress.fromHex(to),
      value: EtherAmount.fromBigInt(
        EtherUnit.wei,
        BigInt.from(amountInWei),
      ),
    );

    final hash = await web3client.sendTransaction(
      _credentials,
      transaction,
      chainId: null,
      fetchChainIdFromNetworkId: true,
    );
    return hash;
  }

  Future<String> signMessage(String messsage) async {
    final signBytes = _credentials.signPersonalMessageToUint8List(
      Uint8List.fromList(messsage.codeUnits),
    );

    return bytesToHex(signBytes);
  }
}
