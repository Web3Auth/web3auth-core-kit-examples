//
//  RecoveryView.swift
//  mpc-core-kit-ios-auth0
//
//  Created by Ayush B on 30/04/24.
//

import SwiftUI

struct RecoveryView: View {
    @StateObject var viewModel: MainViewModel
    @State private var seedPhrase: String = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Recovery Options")) {
                    TextField("Enter your seed phrase", text: $seedPhrase)
                    Button(action: {
                        viewModel.recoverUsingSeedPhrase(seedPhrase: seedPhrase)
                    }, label: {
                        Text("Recover using seed phrase")
                    })
                }
                
                Section(
                    header: Text("Reset"), content: {
                        Text("Please continue with cautious, this will reset the account.")
                        Button(
                            role: .destructive,
                            action: {
                                viewModel.resetAccount()
                            }, label: {
                                Text("Reset Account")
                            })
                    }
                )
            }
        }.alert(isPresented: $viewModel.showAlert, content: {
            Alert(title: Text(viewModel.alertContent))
        })
    }
}
