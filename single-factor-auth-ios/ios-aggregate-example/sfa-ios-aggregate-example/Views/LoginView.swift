//
//  LoginView.swift
//  ios-aggregate-example
//
//  Created by Ayush B on 25/09/24.
//

import Foundation
import SwiftUI

struct LoginView: View {
    @StateObject var viewModel: MainViewModel
    
    var body: some View {
        NavigationView {
            LoadingView(viewModel: viewModel, content: {
                Form{
                    Spacer()
                    Text(
                        "SFA iOS Aggregate Example"
                    ).font(.title)
                        .multilineTextAlignment(.center).frame(
                            maxWidth: .infinity,
                            alignment: .center
                        )
                    
                    Button(
                        action: {
                            viewModel.loginWithGoogle()
                        },
                        label: {
                            Text("Sign in with Google")
                                .frame(
                                    maxWidth: .infinity,
                                    alignment: .center
                                )
                        }
                    ).buttonStyle(.bordered)
                    Button(
                        action: {
                            viewModel.loginWithEmailPasswordless()
                        },
                        label: {
                            Text("Sign in with Email Passwordless")
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
