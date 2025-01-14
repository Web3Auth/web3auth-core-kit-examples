//
//  EthereumClient.swift
//  mpc-core-kit-ios-auth0
//
//  Created by Ayush B on 30/04/24.
//

import Foundation
import Foundation
import web3
import BigInt

struct EthereumClient {
    let web3Client: EthereumHttpClient!
    var networkId: String = "11155111"
    
    init() {
        self.web3Client = EthereumHttpClient(
            url: URL(string: "https://1rpc.io/sepolia")!,
            network: .fromString(networkId)
        )
    }
    
    func getNonce(address: EthereumAddress) async throws -> Int{
        do {
           let nonce = try await web3Client.eth_getTransactionCount(
                address: address, block: .Latest
            )
            return nonce
        } catch let error {
            throw error
        }
    }
    
    func getGasPrice() async throws -> BigUInt {
        do {
            let gasPrice = try await web3Client.eth_gasPrice()
            return gasPrice
        } catch let error {
            throw error
        }
    }
    
    func getGasLimit(transaction: EthereumTransaction) async throws -> BigUInt {
        do {
            let gasLimit = try await web3Client.eth_estimateGas(transaction)
            return gasLimit
        } catch let error {
            throw error
        }
    }
    
    func broadcastSignedTransaction(transaction: SignedTransaction) async throws -> String {
        do {
            guard let transactionHex = transaction.raw?.web3.hexString else {
                throw EthereumClientError.encodeIssue
            }

            let data = try await web3Client.networkProvider.send(
                method: "eth_sendRawTransaction",
                params: [transactionHex],
                receive: String.self
            )
            
            if let hash = data as? String {
                return hash
            } else {
                throw EthereumClientError.unexpectedReturnValue
            }
        } catch let error {
            throw error
        }
    }
    
    func getChainId() -> String {
        return networkId
    }
}
