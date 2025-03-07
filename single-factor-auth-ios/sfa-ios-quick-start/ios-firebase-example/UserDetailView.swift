import SwiftUI

struct UserDetailView: View {
    @State var user: String?
    @Binding var loggedIn: Bool
    @StateObject var viewModel: ViewModel
    
    @State private var showingAlert = false
    @State private var alertContent: String = ""
    
    var body: some View {
        if !viewModel.isAccountReady {
            ProgressView()
        } else {
            if let user = user {
                List {
                    Section {
                        Text(viewModel.userBalance)
                        Text("User balance on Ethereum Sepolia")
                    }
                header: {
                    Text("User Balance")
                }
                    Section {
                        Button(
                            action: {
                                viewModel.signMessage{
                                    result, error in
                                    if result != nil {
                                        alertContent = result!
                                    } else {
                                        alertContent = error!
                                    }
                                    showingAlert = true
                                }
                            },
                            label: {
                                Text("Sign Message")
                            }
                        )
                        Button(
                            action: {
                                viewModel.requestSignature{
                                    result, error in
                                    if result != nil {
                                        alertContent = result!
                                    } else {
                                        alertContent = error!
                                    }
                                    showingAlert = true
                                }
                            },
                            label: {
                                Text("Request Signature")
                            }
                        )
                        Button(
                            action: {
                                viewModel.showWalletUI()
                            },
                            label: {
                                Text("Show Wallet UI")
                            }
                        )
                    } header: {
                        Text("Chain Interactions")
                    }
                    
                    Section {
                        Text("\(user)")
                    } header: {
                        Text("Private key")
                    }
                    
                    Section {
                        Button {
                            viewModel.logout()
                        } label: {
                            Label("Logout", systemImage: "arrow.left.square.fill")
                                .foregroundColor(.red)
                        }
                    }
                }.listStyle(.automatic).alert(isPresented: $showingAlert, content: {
                    Alert(title: Text(alertContent))
                })
                
            }
        }
    }
}


struct UserDetailView_Previews: PreviewProvider {
    static var previews: some View {
        let user: String = "privKey"
        UserDetailView(user: user , loggedIn: .constant(true), viewModel: ViewModel())
    }
}
