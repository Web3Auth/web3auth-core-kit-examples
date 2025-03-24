//
//  LoginView.swift
//  mpc-core-kit-ios-quick-start
//
//  Created by Ayush B on 09/04/24.
//

import SwiftUI

struct LoginView: View {
    @StateObject var viewModel: MainViewModel
    @State private var email: String = ""
    
    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Text(
                "MPC Core-Kit iOS Demo"
            ).font(.title).multilineTextAlignment(.center)
            Button(
                action: {
                    viewModel.loginWithOAuth()
                },
                label: {
                    Text("Sign in with Google")
                }
            ).buttonStyle(.bordered)
            TextField(
                "Enter your email",
                text: $email
            ).textFieldStyle(.roundedBorder).padding()
            Button(
                action: {
                    viewModel.loginWithJWT(verifierId: email)
                },
                label: {
                    Text("Sign in with Mock")
                }
            ).buttonStyle(.bordered)
            
            Spacer()
        }.onAppear {
            try? viewModel.initialize()
        }
        
    }
}

#Preview {
    LoginView(viewModel: MainViewModel())
}
