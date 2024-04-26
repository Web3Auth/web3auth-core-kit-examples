//
//  ContentView.swift
//  mpc-core-kit-ios-quick-start
//
//  Created by Ayush B on 09/04/24.
//

import SwiftUI

struct ContentView: View {
    @StateObject var viewModel: MainViewModel
    
    var body: some View {
        NavigationView {
            if viewModel.isLoggedIn {
                if viewModel.isRecoveryRequired {
                    RecoveryView(viewModel: viewModel)
                } else {
                    HomeView(viewModel: viewModel)
                }
                
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
