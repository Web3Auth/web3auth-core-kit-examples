//
//  ContentView.swift
//  ios-aggregate-example
//
//  Created by Ayush B on 24/09/24.
//

import SwiftUI

struct ContentView: View {
    @StateObject var viewModel: MainViewModel
    
    var body: some View {
        NavigationView {
            if viewModel.isLoggedIn {
                HomeView(viewModel: viewModel)
            } else{
                LoginView(viewModel: viewModel)
            }
        }
    }
}

#Preview {
    ContentView(viewModel: MainViewModel())
}
