//
//  mpc_core_kit_ios_auth0App.swift
//  mpc-core-kit-ios-auth0
//
//  Created by Ayush B on 30/04/24.
//

import SwiftUI

@main
struct mpc_core_kit_ios_auth0App: App {
    var body: some Scene {
        WindowGroup {
            ContentView(viewModel: MainViewModel())
        }
    }
}
