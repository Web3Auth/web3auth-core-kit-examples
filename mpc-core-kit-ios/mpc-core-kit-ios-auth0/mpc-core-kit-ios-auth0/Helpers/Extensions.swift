//
//  Extensions.swift
//  mpc-core-kit-ios-auth0
//
//  Created by Ayush B on 20/05/24.
//

import Foundation
import mpc_core_kit_swift
import tkey
import MpcProviderSwift
import web3

extension MpcCoreKit : EvmSigner {
    public func sign(message: Data) throws -> Data {
        let data =  try self.tssSignSync(message: message)
        return data
    }
    
    public var publicKey: Data {
        let fullAddress = try! KeyPoint(
            address: self.getTssPubKey().hexString
        ).getPublicKey(format: .FullAddress)

      
        return Data(hex: fullAddress)?.suffix(64) ?? Data()
    }

}

