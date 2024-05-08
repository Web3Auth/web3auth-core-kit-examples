//
//  MainViewModel.swift
//  mpc-core-kit-ios-auth0
//
//  Created by Ayush B on 30/04/24.
//

import Foundation
import mpc_core_kit_swift
import MPCEthereumProvider
import web3
import UIKit
import tkey_mpc_swift
import Auth0
import JWTDecode

class MainViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isRecoveryRequired: Bool = false
    @Published var factorPubs: [String] = []
    @Published var showAlert: Bool = false
    @Published var isLoaderVisible: Bool = false
    
    var publicAddress: String!
    
    
    private var mpcCoreKit: MpcCoreKit!
    private var ethereumClient: EthereumClient!
    private var webAuth: WebAuth!
    var alertContent: String = ""
    var loaderContent: String = ""
    
    func initialize() {
        mpcCoreKit = MpcCoreKit(
            web3AuthClientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
            web3AuthNetwork: .SAPPHIRE_MAINNET,
            localStorage: UserStorage()
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
                guard let email = jwt.body["email"] as? String else {
                    throw "Email not found in JWT"
                }
                
                let result = try await mpcCoreKit.loginWithJwt(
                    verifier: "w3a-auth0-demo",
                    verifierId: email,
                    idToken: auth0Creds.idToken
                )
                
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
                showLoader("Signing Message")
                let signature = try mpcCoreKit.signMessage(
                    message: "Welcome to Web3Auth".data(using: .ascii)!
                )
                hideLoader()
                onSigned(signature, nil)
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
                guard let factorKey = mpcCoreKit.mnemonicToKey(
                    shareMnemonic: seedPhrase,
                    format: "mnemonic"
                ) else {
                    hideLoader()
                    return
                }
                
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
                let recoveryFactorKey = try await mpcCoreKit.enableMFA()
                guard let seedPhrase = mpcCoreKit.keyToMnemonic(
                    factorKey: recoveryFactorKey!,
                    format: "mnemonic"
                ) else {
                    hideLoader()
                    return
                }
                
                print(seedPhrase)
                
                UIPasteboard.general.string = seedPhrase
                showAlert(message: "MFA is enabled, and seedphrase is copied to clipboard. \(seedPhrase)")
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
        
        let fullAddress = try KeyPoint(
            address: pubKey.hexString
        ).getPublicKey(format: .FullAddress)
        
        
        let address = KeyUtil.generateAddress(
            from: Data(hex: fullAddress).suffix(64)
        )
        
        publicAddress = address.asString()
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
