//
//  HomeView.swift
//  mpc-core-kit-ios-quick-start
//
//  Created by Ayush B on 09/04/24.
//

import SwiftUI

struct HomeView: View {
    @StateObject var viewModel: MainViewModel
    
    @State private var answer: String = ""
    @State private var question: String = ""
    @State private var signedMessage: String?
    @State private var hash: String?
    
    var body: some View {
        NavigationView {
            LoadingView(viewModel: viewModel, content: {
                Form {
                    Section(header: Text("Public Address")) {
                        Button(
                            action: {
                                UIPasteboard.general.string = viewModel.publicAddress
                            }, label: {
                                Text(viewModel.publicAddress)
                            })
                        
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
                    
                    if(!viewModel.factorPubs.isEmpty) {
                        Section(header: Text("TSS Factors PubKey")) {
                            ForEach(Array(viewModel.factorPubs), id: \.self) { factorPub in
                                HStack(
                                    alignment: .top,
                                    spacing: 24,
                                    content: {
                                        Text(factorPub)
                                        Button(action: {
                                            withAnimation {
                                                viewModel.deleteFactor(
                                                    factorPub: factorPub
                                                )
                                            }
                                        }) {
                                            Label("",systemImage: "trash")
                                        }
                                    }
                                )
                            }
                        }
                    }
                    
                    Section(
                        header: Text("TSS Operations")
                    ) {
                        Button(
                            action: {
                                viewModel.enableMFA()
                            },
                            label: {
                                Text("Enable MFA")
                            }
                        )
                        Button(
                            action: {
                                
                                viewModel.showAlert(message: "creating factor...")
                                viewModel.createNewTssFactor()
                                viewModel.hideLoader()
                            },
                            label: {
                                Text("Create new Factor")
                            }
                        )
                        Button(
                            action: {
                                
                                viewModel.getKeyDetails()
                            },
                            label: {
                                Text("Get Key Details")
                            }
                        )
                        
                        Button(
                            action: {
                                viewModel.logout()
                            },
                            label: {
                                Text("Logout")
                            }
                        )
                        
                        Button(
                            action: {
                                viewModel.resetAccount()
                            },
                            label: {
                                Text("Reset")
                            }
                        )
                    }
                }
            })
        }.alert(isPresented: $viewModel.showAlert, content: {
            Alert(title: Text(viewModel.alertContent))
        })
    }
}
