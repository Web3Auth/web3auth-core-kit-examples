//
//  MainViewModel.swift
//  mpc-core-kit-ios-quick-start
//
//  Created by Ayush B on 09/04/24.
//

import Foundation
import mpc_core_kit_swift
import MPCEthereumProvider
import web3
import UIKit
import tkey_mpc_swift

class MainViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isRecoveryRequired: Bool = false
    @Published var factorPubs: [String] = []
    
    var publicAddress: String!
    
    
    private var mpcCoreKit: MpcCoreKit!
    private var ethereumClient: EthereumClient!
    
    func initialize() {
        mpcCoreKit = MpcCoreKit(
            web3AuthClientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
            web3AuthNetwork: .SAPPHIRE_MAINNET,
            localStorage: UserStorage()
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
                    loginProvider: .google,
                    clientId: "519228911939-cri01h55lsjbsia1k7ll6qpalrus75ps.apps.googleusercontent.com",
                    verifier: "w3a-google-demo"
                    
                )
                
                DispatchQueue.main.async {
                    self.isRecoveryRequired = result.requiredFactors > 0
                }
                
                try await login()
                
            } catch let error {
                DispatchQueue.main.async {
                    self.isRecoveryRequired.toggle()
                }
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
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func deleteFactor(factorPub: String) {
        Task {
            do {
                try await mpcCoreKit.deleteFactor(deleteFactorPub: factorPub)
                refreshFactorPubs()
                
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func signMessage(onSigned: @escaping (_ signedMessage: String?, _ error: String?) -> ()){
            Task {
                do {
                    let signature = try mpcCoreKit.sign(
                        message: "Welcome to Web3Auth"
                    )
                    onSigned(signature.toHexString(), nil)
                } catch let error  {
                    onSigned(nil, error.localizedDescription)
                }
            }
        }
    
    func sendTransaction(onSend: @escaping (String?, String?) -> ()) {
            Task {
                do {
                   
                    let address = EthereumAddress(
                        stringLiteral: self.publicAddress
                    )
                    let transaction = EthereumTransaction.init(
                        to: address,
                        data: Data.init(hex: "0x")
                    )
                    
                    let gasLimit = try await self.ethereumClient.getGasLimit(
                        transaction: transaction
                    )
                    let gasPrice = try await self.ethereumClient.getGasPrice()
                    let nonce = try await self.ethereumClient.getNonce(address: address)
                    
                    let finalTransaction = EthereumTransaction(
                        from: address,
                        to: address,
                        value: TorusWeb3Utils.toWei(ether: 0.001),
                        data: transaction.data,
                        nonce: nonce,
                        gasPrice: gasPrice,
                        gasLimit: gasLimit,
                        chainId: Int(self.ethereumClient.getChainId())
                    )
                    
                    let signedTransaction = try mpcCoreKit.sign(
                        transaction: finalTransaction
                    )
                    
                    let hash = try await ethereumClient.broadcastSignedTransaction(
                        transaction: signedTransaction
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
                    tssShareIndex: .RECOVERY,
                    factorKey: nil,
                    factorDescription: .SeedPhrase
                )
                
                guard let seedPhrase = mpcCoreKit.keyToMnemonic(
                    factorKey: factor,
                    format: "mnemonic"
                ) else {
                    return
                }
                
                print(seedPhrase)
                
                UIPasteboard.general.string = seedPhrase
                refreshFactorPubs()
            }
        }
    }
    
    func recoverUsingSeedPhrase(seedPhrase: String) {
        Task {
            do {
                guard let factorKey = mpcCoreKit.mnemonicToKey(
                    shareMnemonic: seedPhrase,
                    format: "mnemonic"
                ) else {
                    return
                }
                
                try await mpcCoreKit.inputFactor(
                    factorKey: factorKey
                )
                
                DispatchQueue.main.async {
                    self.isRecoveryRequired.toggle()
                }
                
                try await login()
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func enableMFA() {
        Task {
            do {
                _ = try await mpcCoreKit.enableMFA()
                refreshFactorPubs()
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    private func login() async throws {
        let pubKey = try await mpcCoreKit.getTssPubKey()

        let fullAddress = try KeyPoint(
            address: pubKey.hexString
        ).getPublicKey(format: .FullAddress)
        
        
        let address = KeyUtil.generateAddress(
            from: Data(hex: fullAddress).suffix(64)
        )
        
        publicAddress = address.asString()
        refreshFactorPubs()
        toggleIsLoggedIn()
    }
    
    
    private func refreshFactorPubs() {
        Task {
            do {
                let localFactorPubs = try await mpcCoreKit.getAllFactorPubs()
                DispatchQueue.main.async {
                    self.factorPubs = localFactorPubs
                }
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func toggleIsLoggedIn() {
        DispatchQueue.main.async {
            self.isLoggedIn.toggle()
        }
    }
}
