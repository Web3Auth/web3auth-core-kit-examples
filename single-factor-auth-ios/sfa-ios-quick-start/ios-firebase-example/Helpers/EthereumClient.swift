//
//  EthereumClient.swift
//  ios-firebase-example
//
//  Created by Ayush B on 08/04/24.
//

import Foundation

//
//  EthereumClient.swift
//  tkey-ios-mpc
//
//  Created by Ayush B on 27/03/24.
//

import Foundation
import web3
import BigInt
import SingleFactorAuth

struct EthereumClient {
    let web3Client: EthereumHttpClient!
    let ethereumAccount: EthereumAccount!
    var networkId: String = "11155111"
    
    init(sessionData: SessionData) {
        self.web3Client = EthereumHttpClient(
            url: URL(string: "https://1rpc.io/sepolia")!,
            network: .fromString(networkId)
        )
        
        self.ethereumAccount = try! EthereumAccount(keyStorage: sessionData as EthereumSingleKeyStorageProtocol)
    }
    
    func getBalance() async throws -> String {
        do {
            let balanceResponse = try await web3Client.eth_getBalance(
                address: ethereumAccount.address,
                block: EthereumBlock.Latest
            )
            
            guard let decimalWei = Double(balanceResponse.description) else {
                return "0"
            }
            
            return (decimalWei / pow(Double(10), 18)).description
        } catch let error {
            throw error
        }
    }

    func signMessage() throws -> String {
        return try ethereumAccount.signMessage(message: Data.init(hex: "0x1214")!)
    }

}

extension SessionData: EthereumSingleKeyStorageProtocol {
    public func storePrivateKey(key: Data) throws {
        
    }
    
    public func loadPrivateKey() throws -> Data {
        guard let privKeyData = Data.init(hex: self.privateKey) else {
            // Todo make custom error
            return Data()
        }
        return privKeyData
        
    }
    
}
