import SwiftUI

struct UserDetailView: View {
    @State var user: String?
    @Binding var loggedIn: Bool
    @StateObject var viewModel: ViewModel
    
    @State private var showingAlert = false
    @State private var alertContent: String = ""
    
    var body: some View {
        if viewModel.isLoading {
            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.2)
                Text("Logging in...")
                    .foregroundColor(.gray)
            }
        } else if !viewModel.isAccountReady {
            ProgressView()
        } else {
            if let user = user {
                VStack(alignment: .leading, spacing: 24) {
                    
                    VStack(alignment: .leading, spacing: 16) {
                        Text("USER BALANCE")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                            .padding(.horizontal)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text(viewModel.userBalance)
                                .font(.system(size: 24, weight: .regular))
                            Text("User balance on Ethereum Sepolia")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                            Link(destination: URL(string: "https://sepolia.etherscan.io/address/\(viewModel.userAccount)")!) {
                                HStack(spacing: 4) {
                                    Text(viewModel.userAccount)
                                        .lineLimit(1)
                                        .truncationMode(.middle)
                                    Image(systemName: "arrow.up.right.square")
                                        .font(.system(size: 12))
                                }
                                .font(.system(size: 14))
                                .foregroundColor(.blue)
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }
                    
                    VStack(alignment: .leading, spacing: 16) {
                        Text("CHAIN INTERACTIONS")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                            .padding(.horizontal)
                        
                        VStack(spacing: 0) {
                            Button(action: {
                                viewModel.signMessage { result, error in
                                    alertContent = result ?? error ?? ""
                                    showingAlert = true
                                }
                            }) {
                                Text("Sign Message")
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding()
                            }
                            Divider()
                            Button(action: {
                                viewModel.requestSignature { result, error in
                                    alertContent = result ?? error ?? ""
                                    showingAlert = true
                                }
                            }) {
                                Text("Request Signature")
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding()
                            }
                            Divider()
                            Button(action: {
                                viewModel.showWalletUI()
                            }) {
                                Text("Show Wallet UI")
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding()
                            }
                        }
                        .background(Color(uiColor: .secondarySystemBackground))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }
                    
                    VStack(alignment: .leading, spacing: 16) {
                        Text("PRIVATE KEY")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                            .padding(.horizontal)
                        
                        Text(user)
                            .font(.system(size: 16))
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(uiColor: .secondarySystemBackground))
                            .cornerRadius(12)
                            .padding(.horizontal)
                    }
                    
                    Button(action: {
                        viewModel.logout()
                    }) {
                        HStack {
                            Image(systemName: "arrow.left")
                            Text("Logout")
                        }
                        .foregroundColor(.red)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }
                    
                    Spacer()
                }
                .alert(isPresented: $showingAlert) {
                    Alert(title: Text(alertContent))
                }
            }
        }
    }
}

struct UserDetailView_Previews: PreviewProvider {
    static var previews: some View {
        let user: String = "privKey"
        UserDetailView(user: user, loggedIn: .constant(true), viewModel: ViewModel())
    }
}
