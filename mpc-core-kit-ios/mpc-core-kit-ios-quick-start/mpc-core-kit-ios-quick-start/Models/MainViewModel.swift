//
//  MainViewModel.swift
//  mpc-core-kit-ios-quick-start
//
//  Created by Ayush B on 09/04/24.
//

import Foundation
import mpc_core_kit_swift
import MpcProviderSwift
import web3
import UIKit

@MainActor class MainViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isRecoveryRequired: Bool = false
    @Published var factorPubs: [String] = []
    
    @Published var showAlert: Bool = false
    
    @Published var isLoaderVisible: Bool = false
    
    var publicAddress: String!
    
    
    private var mpcCoreKit: MpcCoreKit!
    private var ethereumClient: EthereumClient!
    private var mpcEthereumProvider: MPCEthereumProvider!
    
    
    var alertContent: String = ""
    var loaderContent: String = ""
    
    func initialize() throws {
        mpcCoreKit = try MpcCoreKit(
            options: .init(web3AuthClientId: "BHgArYmWwSeq21czpcarYh0EVq2WWOzflX-NTK-tY1-1pauPzHKRRLgpABkmYiIV_og9jAvoIxQ8L3Smrwe04Lw",
                           web3AuthNetwork: .SAPPHIRE_DEVNET, storage: UserStorage()
                 )
        )
        
        ethereumClient = EthereumClient()
    }
    
    func mockLogin(email: String) async throws -> Data {
        // Create URL
        let url = URL(string: "https://li6lnimoyrwgn2iuqtgdwlrwvq0upwtr.lambda-url.eu-west-1.on.aws/")!

        // Create URLRequest
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Create JSON data to send in the request body
        // verifier: "torus-key-test", scope: "email", extraPayload: { email }, alg: "ES256"
        let jsonObject: [String: Any] = [
            "verifier": "torus-test-health",
            "iss" : "torus-key-test",
            "aud" : "torus-key-test",
            "emailVerified": true,
            "email": email,
            "scope": email,
            "extraPayload": [
                "email": email,
            ],
            "alg": "ES256",
        ]
        let jsonData = try JSONSerialization.data(withJSONObject: jsonObject)
        request.httpBody = jsonData

        // Perform the request asynchronously
        let (data, _) = try await URLSession.shared.data(for: request)

        return data
    }
    
    
    func loginWithJWT(verifierId: String) {
        Task {
            do {
                let verifierId = verifierId
                let verifier = "torus-test-health"
                let clientId = "torus-test-health"
                let email = verifierId
                
                let mockResult = try await mockLogin(email: email)
                
                guard let mockResult = try JSONSerialization.jsonObject(with: mockResult) as? [String: Any] else {
                    throw NSError(domain: "", code: 0, userInfo: nil)
                    
                }
                guard let token = mockResult["token"] as? String else {
                    throw NSError(domain: "", code: 0, userInfo: nil)
                    
                }
                print(token)
                
                
                mpcCoreKit = try MpcCoreKit(
                    options: .init(web3AuthClientId: clientId,
                                   web3AuthNetwork: .SAPPHIRE_DEVNET, storage: UserStorage()
                         )
                )
                
                let result = try await mpcCoreKit.loginWithJwt(
                    verifier: verifier,
                    verifierId: email,
                    idToken: token
                )
                
                self.isRecoveryRequired = result.requiredFactors > 0
                
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
                    singleLoginParams: .init(typeOfLogin: .google, verifier: "w3a-sfa-web-google", clientId: "519228911939-cri01h55lsjbsia1k7ll6qpalrus75ps.apps.googleusercontent.com")
                )
                
                self.isRecoveryRequired = result.requiredFactors > 0
                
                try await login()
                
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    
    func resetAccount() {
        Task {
            do {
                try await mpc_core_kit_swift.resetAccount(coreKitInstance: mpcCoreKit)
                self.isRecoveryRequired = false
                self.isLoggedIn = false
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
                let signature = try mpcEthereumProvider.signMessage(message: "YOUR_MESSAGE".data(using: .ascii)!)
                onSigned(signature, nil)
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
                    data: Data.init(hex: "0x") ?? Data()
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
                
                let signedTransaction = try mpcEthereumProvider.sign(
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
                    tssShareIndex: .recovery,
                    factorKey: nil,
                    factorDescription: .SeedPhrase
                )
                
                let seedPhrase = try FactorSerialization.keyToMnemonic(tkey: mpcCoreKit.tkey!,
                                                                       shareHex: factor
                )
                
                print(seedPhrase)
                
                UIPasteboard.general.string = seedPhrase
                try await refreshFactorPubs()
            }
        }
    }
    
    func recoverUsingSeedPhrase(seedPhrase: String) {
        Task {
            do {
                let factorKey = try FactorSerialization.mnemonicToKey(tkey: mpcCoreKit.tkey!,
                    shareMnemonic: seedPhrase
                )
                
                print(factorKey.count)
                
                try await mpcCoreKit.inputFactorKey(
                    factorKey: factorKey
                )
                
                try await login()
                
                self.isRecoveryRequired.toggle()
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func getKeyDetails() {
        Task {
            do {
                let keyDetails = try await mpcCoreKit.getKeyDetails()
                print(keyDetails)
            } catch let error {
                print(error)
            }
        }
    }
    
    func enableMFA() {
        Task {
            do {
                _ = try await mpcCoreKit.enableMFA()
                try await refreshFactorPubs()
            } catch let error {
                print(error.localizedDescription)
            }
        }
    }
    
    func logout() {
        Task {
            do {
                try await mpcCoreKit.logout()
                toggleIsLoggedIn()
            }
        }
    }
    
    private func login() async throws {
        mpcEthereumProvider = MPCEthereumProvider(evmSigner: mpcCoreKit)
        publicAddress = mpcEthereumProvider.address.toChecksumAddress()
        try await refreshFactorPubs()
        toggleIsLoggedIn()
    }
    
    
    private func refreshFactorPubs() async throws {
        let localFactorPubs = try await mpcCoreKit.getAllFactorPubs()
        self.factorPubs = localFactorPubs
    }
    
    func toggleIsLoggedIn() {
        DispatchQueue.main.async {
            self.isLoggedIn.toggle()
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
    
    func showAlert(message: String) {
        alertContent = message
        DispatchQueue.main.async {
            self.showAlert = true
        }
    }
}
