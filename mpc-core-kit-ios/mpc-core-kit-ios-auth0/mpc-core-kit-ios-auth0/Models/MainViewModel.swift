//
//  MainViewModel.swift
//  mpc-core-kit-ios-auth0
//
//  Created by Ayush B on 30/04/24.
//

import Foundation
import mpc_core_kit_swift
import MpcProviderSwift
import web3
import UIKit
import tkey
import Auth0
import JWTDecode

class MainViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isRecoveryRequired: Bool = false
    @Published var factorPubs: [String] = []
    @Published var showAlert: Bool = false
    @Published var isLoaderVisible: Bool = false
    
    var publicAddress: EthereumAddress!
    
    private var mpcCoreKit: MpcCoreKit!
    private var ethereumClient: EthereumClient!
    private var webAuth: WebAuth!
    var userInfo: [String: Any]!
    var alertContent: String = ""
    var loaderContent: String = ""
    
    func initialize() {
        mpcCoreKit = try! MpcCoreKit(
            options: .init(
                web3AuthClientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
                manualSync: false,
                web3AuthNetwork: .sapphire(.SAPPHIRE_MAINNET),
                localStorage: UserStorage(),
                overwriteMetadataUrl: "http://127.0.0.1:5051"
            )
        )
        
        webAuth = Auth0.webAuth(clientId: "hUVVf4SEsZT7syOiL0gLU9hFEtm2gQ6O", domain: "web3auth.au.auth0.com")
        
        ethereumClient = EthereumClient()
    }
    
    // com.w3a.mpc-core-kit-ios-auth0://web3auth.au.auth0.com/ios/com.w3a.mpc-core-kit-ios-auth0/callback
    //com.example.MyApp://example.us.auth0.com/ios/com.example.MyApp/callback
    
    func loginWithAuth0JWT() {
        Task {
            do {
                showLoader("Login in")
                let auth0Creds = try await webAuth.connection("apple").start()
                
                let jwt = try decode(jwt: auth0Creds.idToken)
                guard let sub = jwt.body["sub"] as? String else {
                    throw "Sub not found in JWT"
                }
                
                let result = try await mpcCoreKit.loginWithJwt(
                    verifier: "core-kit-swift",
                    verifierId: sub,
                    idToken: auth0Creds.idToken
                )
                
                userInfo = try mpcCoreKit.getUserInfo()
                
                DispatchQueue.main.async {
                    self.isRecoveryRequired = result.requiredFactors > 0
                }
                
                if(!self.isRecoveryRequired) {
                    try await login()
                    
                }
                
                hideLoader()
            } catch let error {
                hideLoader()
                print(error.localizedDescription)
            }
        }
    }
    
    func showLoader(_ message: String) {
        loaderContent = message
        DispatchQueue.main.async {
            self.isLoaderVisible = true
        }
    }
    
    func hideLoader() {
        DispatchQueue.main.async {
            self.isLoaderVisible = false
        }
    }
    
    func resetAccount() {
        Task {
            do {
                showLoader("Resetting Account")
                try await mpcCoreKit.resetAccount()
                DispatchQueue.main.async {
                    self.isRecoveryRequired.toggle()
                }
                hideLoader()
            } catch let error {
                hideLoader()
                showAlert(message: error.localizedDescription)
                print(error.localizedDescription)
            }
        }
    }
    
    func deleteFactor(factorPub: String) {
        Task {
            do {
                showLoader("Deleting Factor")
                try await mpcCoreKit.deleteFactor(deleteFactorPub: factorPub)
                await refreshFactorPubs()
                hideLoader()
            } catch let error {
                hideLoader()
                showAlert(message: error.localizedDescription)
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
                hideLoader()
                onSigned(signature.hexString, nil)
            } catch let error  {
                hideLoader()
                onSigned(nil, error.localizedDescription)
                showAlert(message: error.localizedDescription)
            }
        }
    }
    
    func sendTransaction(onSend: @escaping (String?, String?) -> ()) {
        Task {
            do {
                showLoader("Sending Transaction")
                let transaction = EthereumTransaction.init(
                    to: self.publicAddress,
                    data: Data.init(hex: "0x00")!
                )
                
                let gasLimit = try await self.ethereumClient.getGasLimit(
                    transaction: transaction
                )
                let gasPrice = try await self.ethereumClient.getGasPrice()
                let nonce = try await self.ethereumClient.getNonce(address: self.publicAddress)
                
                let finalTransaction = EthereumTransaction(
                    from: self.publicAddress,
                    to: self.publicAddress,
                    value: 1000000000000,
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
                hideLoader()
                onSend(hash, nil)
                
                
            } catch let error {
                hideLoader()
                print(error.localizedDescription)
                onSend(nil, error.localizedDescription)
                showAlert(message: error.localizedDescription)
            }
        }
    }
    
    func createNewTssFactor() {
        Task {
            do {
                showLoader("Adding new factor")
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
                showAlert(message: "New factor created, and seed phrase is copied to clipboard. \(seedPhrase)")
                hideLoader()
                await refreshFactorPubs()
            } catch let error {
                hideLoader()
                showAlert(message: error.localizedDescription)
            }
        }
    }
    
    func recoverUsingSeedPhrase(seedPhrase: String) {
        Task {
            do {
                showLoader("Recovering account")
                let factorKey = try mpcCoreKit.mnemonicToKey(
                    shareMnemonic: seedPhrase,
                    format: "mnemonic"
                )
                
                try await mpcCoreKit.inputFactor(
                    factorKey: factorKey
                )
                
                
                try await login()
                hideLoader()
                DispatchQueue.main.async {
                    self.isRecoveryRequired.toggle()
                }
            } catch let error {
                hideLoader()
                print(error.localizedDescription)
                showAlert(message: error.localizedDescription)
            }
        }
    }
    
    func enableMFA() {
        Task {
            do {
                showLoader("Enabling MFA")
                let recoveryFactorKey = try await mpcCoreKit.enableMFAWithRecoveryFactor()
//                let seedPhrase = try mpcCoreKit.keyToMnemonic(
//                    factorKey: recoveryFactorKey,
//                    format: "mnemonic"
//                )
//                
//                print(seedPhrase)
//                
//                UIPasteboard.general.string = seedPhrase
//                showAlert(message: "MFA is enabled, and seedphrase is copied to clipboard. \(seedPhrase)")
                hideLoader()
                await refreshFactorPubs()
            } catch let error {
                hideLoader()
                print(error.localizedDescription)
                showAlert(message: error.localizedDescription)
            }
        }
    }
    
    private func login() async throws {
        let pubKey = try await mpcCoreKit.getTssPubKey()
        let keyDetails = try await mpcCoreKit.getKeyDetails()
        print(keyDetails.requiredFactors)
        
        
        let fullAddress = try KeyPoint(
            address: pubKey.hexString
        ).getPublicKey(format: .FullAddress)
        
        
        publicAddress = KeyUtil.generateAddress(
            from: Data(hex: fullAddress)!.suffix(64)
        )
        
        await refreshFactorPubs()
        toggleIsLoggedIn()
    }
    
    func showAlert(message: String) {
        alertContent = message
        DispatchQueue.main.async {
            self.showAlert = true
        }
    }
    
    
    private func refreshFactorPubs() async {
        do {
            let localFactorPubs = try await mpcCoreKit.getAllFactorPubs()
            DispatchQueue.main.async {
                self.factorPubs = localFactorPubs
            }
        } catch let error {
            showAlert(message: error.localizedDescription)
            print(error.localizedDescription)
        }
    }
    
    func toggleIsLoggedIn() {
        DispatchQueue.main.async {
            self.isLoggedIn.toggle()
        }
    }
}
