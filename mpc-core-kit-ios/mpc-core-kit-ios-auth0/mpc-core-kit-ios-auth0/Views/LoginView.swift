//
//  LoginView.swift
//  mpc-core-kit-ios-auth0
//
//  Created by Ayush B on 30/04/24.
//

import SwiftUI

struct LoginView: View {
    @StateObject var viewModel: MainViewModel
    
    var body: some View {
        NavigationView {
            LoadingView(viewModel: viewModel, content: {
                Form{
                    Spacer()
                    Text(
                        "MPC Core-Kit iOS Auth0 Demo"
                    ).font(.title)
                        .multilineTextAlignment(.center).frame(
                            maxWidth: .infinity,
                            alignment: .center
                        )
                    
                    Button(
                        action: {
                            viewModel.loginWithAuth0JWT()
                        },
                        label: {
                            Text("Sign in with Auth0")
                                .frame(
                                    maxWidth: .infinity,
                                    alignment: .center
                                )
                        }
                    ).buttonStyle(.bordered)
                    Spacer()
                }.onAppear {
                    viewModel.initialize()
                }.formStyle(.columns).padding()
            })
        }.alert(isPresented: $viewModel.showAlert, content: {
            Alert(title: Text(viewModel.alertContent))
        })
    }
}

#Preview {
    LoginView(viewModel: MainViewModel())
}
