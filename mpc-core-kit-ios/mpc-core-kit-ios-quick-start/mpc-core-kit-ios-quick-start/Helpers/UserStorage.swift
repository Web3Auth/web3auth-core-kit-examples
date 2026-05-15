//
//  UserStorage.swift
//  mpc-core-kit-ios-quick-start
//
//  Created by Ayush B on 09/04/24.
//

import Foundation
import mpc_core_kit_swift

class UserStorage : IStorage {
    func get(key: String) async throws -> Data {
        print(key)
        guard let data = UserDefaults().value(forKey: key) as? Data else  {
            return Data()
        }
        return data
    }

    func set(key: String, payload: Data) async throws {
        UserDefaults().setValue(payload, forKey: key)
    }
}
