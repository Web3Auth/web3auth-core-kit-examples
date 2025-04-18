//
//  ContentView.swift
//  mpc-core-kit-ios-auth0
//
//  Created by Ayush B on 30/04/24.
//

import SwiftUI

struct ContentView: View {
    @StateObject var viewModel: MainViewModel
    
    var body: some View {
        NavigationView {
            if viewModel.isLoggedIn {
                HomeView(viewModel: viewModel)
            } else if viewModel.isRecoveryRequired {
                RecoveryView(viewModel: viewModel)
            } else {
                LoginView(viewModel: viewModel)
            }
        }
    }
}

#Preview {
    ContentView(viewModel: MainViewModel())
}
