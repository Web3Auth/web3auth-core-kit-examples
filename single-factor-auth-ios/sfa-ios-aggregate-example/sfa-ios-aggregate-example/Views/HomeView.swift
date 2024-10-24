//
//  HomeView.swift
//  ios-aggregate-example
//
//  Created by Ayush B on 25/09/24.
//

import SwiftUI

struct HomeView: View {
    @StateObject var viewModel: MainViewModel
    @State private var signedMessage: String?
    @State private var hash: String?
    
    var body: some View {
        NavigationView {
            LoadingView(viewModel: viewModel, content: {
                Form {
                    Section(header: Text("User Info")) {
                        Button(
                            action: {
                                viewModel.showAlert(message: "Address is copied to clipboard")
                                UIPasteboard.general.string = viewModel.publicAddress
                            }, label: {
                                Text(viewModel.publicAddress)
                            })
                        
                        Button(
                            action: {
                                viewModel.showAlert(message: viewModel.userInfo.debugDescription)
                            }, label: {
                                Text("View User info")
                            })
                        
                        Text("Balance: " +  viewModel.balance)
                        
                    }
                    
                    
                    Section(header: Text("Chain Interactions")) {
                        Button(
                            action: {
                                viewModel.signMessage{
                                    result, error in
                                    if result != nil {
                                        signedMessage = result
                                    }
                                }
                            },
                            label: {
                                Text("Sign Message")
                            }
                        )
                        
                        if signedMessage != nil {
                            Text(signedMessage!)
                        }
                        
                        Button(
                            action: {
                                viewModel.sendTransaction{
                                    result, error in
                                    if result != nil {
                                        hash = result
                                    }
                                }
                            },
                            label: {
                                Text("Send 0.001 ETH")
                            }
                        )
                        
                        if(hash != nil) {
                            Link(
                                hash!,
                                destination: URL(
                                    string: "https://sepolia.etherscan.io/tx/\(hash!)"
                                )!
                            ).underline()
                        }
                        
                        Text("The sample uses Eth Sepolia, you can choose any EVM network of your choice. Send 0.001 ETH will perform self transfer of ETH. You'll need to have Sepolia faucet to perform transaction.").font(.caption)
                        
                    }
                    Button(
                        role: .destructive, action: {
                            viewModel.logout()
                        }, label: {
                            Text("Logout")
                        })
                }
            }).onAppear {
                viewModel.loadBalance()
            }
        }.alert(isPresented: $viewModel.showAlert, content: {
            Alert(title: Text(viewModel.alertContent))
        })
    }
}
