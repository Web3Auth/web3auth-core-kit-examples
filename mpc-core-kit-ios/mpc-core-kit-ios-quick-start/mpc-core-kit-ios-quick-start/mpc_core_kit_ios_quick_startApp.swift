//
//  mpc_core_kit_ios_quick_startApp.swift
//  mpc-core-kit-ios-quick-start
//
//  Created by Ayush B on 09/04/24.
//

import SwiftUI

@main
struct mpc_core_kit_ios_quick_startApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView(viewModel: MainViewModel())
        }
    }
}
