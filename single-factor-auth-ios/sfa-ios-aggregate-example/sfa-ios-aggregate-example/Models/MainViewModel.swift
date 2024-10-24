//
//  MainViewModel.swift
//  ios-aggregate-example
//
//  Created by Ayush B on 25/09/24.
//

import Foundation
import web3
import UIKit
import Auth0
import JWTDecode
import SingleFactorAuth

class MainViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var showAlert: Bool = false
    @Published var isLoaderVisible: Bool = false
    @Published var balance: String = "0.0"
    
    var publicAddress: String!
    
    
    private var singleFactorAuth: SingleFactorAuth!
    private var ethereumClient: EthereumClient!
    private var ethereumAccount: EthereumAccount!
    private var sessionData: SessionData!
    private var webAuth: WebAuth!
    var userInfo: [String: Any]!
    var alertContent: String = ""
    var loaderContent: String = ""
    
    func initialize() {
        singleFactorAuth = try! SingleFactorAuth(
            params: .init(
                clientId:  "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
                web3AuthNetwork: .SAPPHIRE_MAINNET
            )
        )
        webAuth = Auth0.webAuth(clientId: "hUVVf4SEsZT7syOiL0gLU9hFEtm2gQ6O", domain: "web3auth.au.auth0.com")
        
        ethereumClient = EthereumClient()
        checkSession()
    }
    
    // com.w3a.ios-aggregate-example://web3auth.au.auth0.com/ios/com.w3a.ios-aggregate-example/callback
    // com.example.MyApp://example.us.auth0.com/ios/com.example.MyApp/callback
    
    func loginWithGoogle() {
        Task {
            do {
                showLoader("Login in")
                let auth0Creds = try await webAuth.connection("google-oauth2").start()
                
                let jwt = try decode(jwt: auth0Creds.idToken)
                guard let sub = jwt.body["email"] as? String else {
                    throw AggergateSampleError.runtimeError("Email not found in JWT")
                }
                
                sessionData = try await singleFactorAuth.connect(loginParams: .init(
                    verifier: "sfa-mobile-aggregate-verifier",
                    verifierId: sub,
                    idToken: auth0Creds.idToken,
                    subVerifierInfoArray: [
                        TorusSubVerifierInfo(verifier: "sfa-mobile-aggregate-auth0-google", idToken:  auth0Creds.idToken)
                    ]
                )
                )
                
                userInfo = jwt.body
                try await login()
                
                hideLoader()
            } catch let error {
                hideLoader()
                print(error.localizedDescription)
            }
        }
    }
    
    func loadBalance() {
        Task {
            do {
                showLoader("Loading balance")
                
                let balanceResponse = try await ethereumClient.getBalance(address: ethereumAccount.address)
                
                // Step 4: Update the UI state
                DispatchQueue.main.async {
                    self.balance = balanceResponse
                }
                
                hideLoader()
                
            } catch let error {
                hideLoader()
                print("Error in loadAccount: \(error.localizedDescription)")
                showAlert(message: error.localizedDescription)
            }
        }
    }
    
    func loginWithEmailPasswordless() {
        Task {
            do {
                showLoader("Logging in")
                let auth0Creds = try await webAuth.connection("").start()
                
                let jwt = try decode(jwt: auth0Creds.idToken)
                guard let sub = jwt.body["email"] as? String else {
                    throw AggergateSampleError.runtimeError("Email not found in JWT")
                }
                
                sessionData = try await singleFactorAuth.connect(loginParams: .init(
                    verifier: "sfa-mobile-aggregate-verifier",
                    verifierId: sub,
                    idToken: auth0Creds.idToken,
                    subVerifierInfoArray: [
                        TorusSubVerifierInfo(verifier: "sfa-mobile-aggergate-passwordless", idToken: auth0Creds.idToken)
                    ]
                )
                )
                userInfo = jwt.body
                try await login()
                hideLoader()
            } catch let error {
                hideLoader()
                print(error.localizedDescription)
            }
        }
    }
    
    func checkSession() {
        Task {
            do {
                showLoader("Checking Session")
                try await singleFactorAuth.initialize()
                sessionData = singleFactorAuth.getSessionData()
                if(sessionData != nil) {
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
    
    func signMessage(onSigned: @escaping (_ signedMessage: String?, _ error: String?) -> ()){
        Task {
            do {
                showLoader("Signing Message")
                let signature = try ethereumAccount.signMessage(
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
                    data: Data.init(hex: "0x00")!
                )
                
                let gasLimit = try await self.ethereumClient.getGasLimit(
                    transaction: transaction
                )
                let gasPrice = try await self.ethereumClient.getGasPrice()
                let nonce = try await self.ethereumClient.getNonce(address: address)
                
                let finalTransaction = EthereumTransaction(
                    from: address,
                    to: address,
                    value: 1000000000000,
                    data: transaction.data,
                    nonce: nonce,
                    gasPrice: gasPrice,
                    gasLimit: gasLimit,
                    chainId: Int(self.ethereumClient.getChainId())
                )
                
                let signedTransaction = try ethereumAccount.sign(
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
    
    
    
    private func login() async throws {
        ethereumAccount = try EthereumAccount(keyStorage: sessionData as EthereumSingleKeyStorageProtocol)
        publicAddress = ethereumAccount.address.toChecksumAddress()
        toggleIsLoggedIn()
    }
    
    func logout()  {
        Task {
            do {
                showLoader("Logging out")
                try await singleFactorAuth.logout()
                toggleIsLoggedIn()
                hideLoader()
            } catch let error {
                hideLoader()
                print(error.localizedDescription)
                showAlert(message: error.localizedDescription)
            }
        }
    }
    
    func showAlert(message: String) {
        alertContent = message
        DispatchQueue.main.async {
            self.showAlert = true
        }
    }

    
    func toggleIsLoggedIn() {
        DispatchQueue.main.async {
            self.isLoggedIn.toggle()
        }
    }
}
