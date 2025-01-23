//
//  HomeView.swift
//  mpc-core-kit-ios-auth0
//
//  Created by Ayush B on 30/04/24.
//

import SwiftUI
import CustomAuth

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
                                viewModel.showAlert(message: (viewModel.userInfo as! UserInfo).name)
                            }, label: {
                                Text("View User info")
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
                                viewModel.setDeviceFactor()
                            },
                            label: {
                                Text("Set Device Factor")
                            }
                        )
                        Button(
                            action: {
                                viewModel.getDeviceFactor()
                            },
                            label: {
                                Text("Get Device Factor")
                            }
                        )
                        Button(
                            action: {
                                viewModel.createNewTssFactor()
                            },
                            label: {
                                Text("Create new Factor")
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
