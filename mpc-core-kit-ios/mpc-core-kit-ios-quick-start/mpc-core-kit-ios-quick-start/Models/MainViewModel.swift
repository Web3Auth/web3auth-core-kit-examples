//
//  MainViewModel.swift
//  mpc-core-kit-ios-quick-start
//
//  Created by Ayush B on 09/04/24.
//

import Foundation
import mpc_core_kit_swift
import Web3SwiftMpcProvider
import web3
import UIKit

class MainViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isRecoveryRequired: Bool = false
    @Published var factorPubs: [String] = []
    
    var publicAddress: EthereumAddress!
    
    
    private var mpcCoreKit: MpcCoreKit!
    private var ethereumClient: EthereumClient!
    
    func initialize() {
        mpcCoreKit = try! MpcCoreKit(
            options: Web3AuthOptions(
                web3AuthClientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
                manualSync: false,
                web3AuthNetwork: .sapphire(.SAPPHIRE_MAINNET),
                localStorage: UserStorage()
            )
        )
        
        ethereumClient = EthereumClient()
    }
    
    func loginWithJWT() {
        Task {
            do {
                let result = try await mpcCoreKit.loginWithJwt(
                    verifier: "w3a-firebase-demo",
                    verifierId: "",
                    idToken: "String"
                )
                
                DispatchQueue.main.async {
                    self.isRecoveryRequired = result.requiredFactors > 0
                }
                
                try await login()
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func loginWithOAuth() {
        Task {
            do {
                let result = try await mpcCoreKit.loginWithOAuth(
                    singleLoginParams: .init(
                        typeOfLogin: .google,
                        verifier: "w3a-google-demo", 
                        clientId: "519228911939-cri01h55lsjbsia1k7ll6qpalrus75ps.apps.googleusercontent.com"
                    )
                )
                
                DispatchQueue.main.async {
                    self.isRecoveryRequired = result.requiredFactors > 0
                }
                
                try await login()
                
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    
    func resetAccount() {
        Task {
            do {
                try await mpcCoreKit.resetAccount()
                DispatchQueue.main.async {
                    self.isRecoveryRequired.toggle()
                }
                toggleIsLoggedIn()
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func deleteFactor(factorPub: String) {
        Task {
            do {
                try await mpcCoreKit.deleteFactor(deleteFactorPub: factorPub)
                try await refreshFactorPubs()
                
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func signMessage(onSigned: @escaping (_ signedMessage: String?, _ error: String?) -> ()){
        Task {
            do {
                let message = "YOUR_MESSAGE".data(using: .ascii)!
                let prefix = "\u{19}Ethereum Signed Message:\n\(String(message.count))"
                guard var data = prefix.data(using: .ascii) else {
                    throw "Incorrect Data"
                }
                
                data.append(message)
                let hash = data.web3.keccak256
                let signature = try await mpcCoreKit.tssSign(message: hash)
               
                onSigned(signature.web3.hexString, nil)
            } catch let error  {
                onSigned(nil, error.localizedDescription)
            }
        }
    }
    
    func sendTransaction(onSend: @escaping (String?, String?) -> ()) {
        Task {
            do {
                
                let address = EthereumAddress(
                    stringLiteral: self.publicAddress.toChecksumAddress()
                )
                let transaction = EthereumTransaction.init(
                    to: address,
                    data: Data.init(hex: "0x")!
                )
                
                let gasLimit = try await self.ethereumClient.getGasLimit(
                    transaction: transaction
                )
                let gasPrice = try await self.ethereumClient.getGasPrice()
                let nonce = try await self.ethereumClient.getNonce(address: address)
                
                let finalTransaction = EthereumTransaction(
                    from: address,
                    to: address,
                    value: 1000000000000000,
                    data: transaction.data,
                    nonce: nonce,
                    gasPrice: gasPrice,
                    gasLimit: gasLimit,
                    chainId: Int(self.ethereumClient.getChainId())
                )
                
               
                
                let signedTransaction = try await mpcCoreKit.tssSign(message: finalTransaction.raw!.web3.keccak256)
                
                let hash = try await ethereumClient.broadcastSignedTransaction(
                    transactionHex: signedTransaction.hexString
                )
                
                onSend(hash, nil)
                
                
            } catch let error {
                print(error.localizedDescription)
                onSend(nil, error.localizedDescription)
            }
        }
    }
    
    func createNewTssFactor() {
        Task {
            do {
                let factor = try await mpcCoreKit.createFactor(
                    tssShareIndex: .recovery,
                    factorKey: nil,
                    factorDescription: .SeedPhrase
                )
                
                let seedPhrase = try mpcCoreKit.keyToMnemonic(
                    factorKey: factor,
                    format: "mnemonic"
                )
                
                print(seedPhrase)
                
                UIPasteboard.general.string = seedPhrase
                try await refreshFactorPubs()
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func recoverUsingSeedPhrase(seedPhrase: String) {
        Task {
            do {
                let factorKey = try mpcCoreKit.mnemonicToKey(
                    shareMnemonic: seedPhrase,
                    format: "mnemonic"
                )
                
                print(factorKey.count)
                
                try await mpcCoreKit.inputFactor(
                    factorKey: factorKey
                )
                
                try await login()
                
                DispatchQueue.main.async {
                    self.isRecoveryRequired.toggle()
                }
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func enableMFA() {
        Task {
            do {
                _ = try await mpcCoreKit.enableMFAWithRecoveryFactor()
                try await refreshFactorPubs()
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    private func login() async throws {
        let extendedPubKey = try await mpcCoreKit.getTssPubKey()
        
        
        publicAddress = KeyUtil.generateAddress(from: extendedPubKey)
        try await refreshFactorPubs()
        toggleIsLoggedIn()
    }
    
    
    private func refreshFactorPubs() async throws {
        let localFactorPubs = try await mpcCoreKit.getAllFactorPubs()
        DispatchQueue.main.async {
            self.factorPubs = localFactorPubs
        }
    }
    
    func toggleIsLoggedIn() {
        DispatchQueue.main.async {
            self.isLoggedIn.toggle()
        }
    }
}
