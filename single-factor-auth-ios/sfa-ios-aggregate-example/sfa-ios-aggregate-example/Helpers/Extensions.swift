//
//  Extensions.swift
//  ios-aggregate-example
//
//  Created by Ayush B on 25/09/24.
//

import Foundation
import SingleFactorAuth
import web3

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
