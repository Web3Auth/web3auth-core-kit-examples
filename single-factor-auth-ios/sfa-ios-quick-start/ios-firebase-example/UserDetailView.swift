import SwiftUI

struct UserDetailView: View {
    @State var user: String?
    @Binding var loggedIn: Bool
    @StateObject var viewModel: ViewModel
    
    @State private var showingAlert = false
    @State private var alertContent: String = ""
    @State private var isPrivateKeyVisible = false
    @State private var recipientAddress: String = ""
    @State private var amount: String = ""
    @State private var isSending = false
    @State private var lastTxHash: String? = nil
    @State private var showingTxDetails = false
    
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
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("USER BALANCE")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                                .padding(.horizontal)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text(viewModel.userBalance)
                                    .font(.system(size: 24, weight: .regular))
                                Text("User balance on Polygon Amoy")
                                    .font(.subheadline)
                                    .foregroundColor(.gray)
                                Link(destination: URL(string: "https://amoy.polygonscan.com/address/\(viewModel.userAccount)")!) {
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
                            Text("SEND TRANSACTION")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                                .padding(.horizontal)
                            
                            VStack(spacing: 16) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Recipient Address")
                                        .font(.subheadline)
                                        .foregroundColor(.gray)
                                    TextField("0x...", text: $recipientAddress)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                        .font(.system(.body, design: .monospaced))
                                }
                                
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Amount (ETH)")
                                        .font(.subheadline)
                                        .foregroundColor(.gray)
                                    TextField("0.0", text: $amount)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                        .keyboardType(.decimalPad)
                                }
                                
                                Button(action: {
                                    isSending = true
                                    viewModel.sendTransaction(to: recipientAddress, amount: amount) { success, error, txHash in
                                        isSending = false
                                        if success {
                                            lastTxHash = txHash
                                            showingTxDetails = true
                                            // Clear input fields
                                            recipientAddress = ""
                                            amount = ""
                                        } else {
                                            alertContent = error ?? "Failed to send transaction"
                                            showingAlert = true
                                        }
                                    }
                                }) {
                                    HStack {
                                        if isSending {
                                            ProgressView()
                                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                                .scaleEffect(0.8)
                                        } else {
                                            Image(systemName: "arrow.up.right")
                                                .foregroundColor(.white)
                                                .font(.system(size: 16, weight: .semibold))
                                        }
                                        Text("Send")
                                            .foregroundColor(.white)
                                            .font(.system(size: 16, weight: .semibold))
                                    }
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 44)
                                    .background(Color.black)
                                    .cornerRadius(22)
                                }
                                .disabled(isSending || recipientAddress.isEmpty || amount.isEmpty)
                                
                                if showingTxDetails, let hash = lastTxHash {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Transaction sent!")
                                            .font(.headline)
                                            .foregroundColor(.green)
                                        
                                        Link(destination: URL(string: "https://sepolia.etherscan.io/tx/\(hash)")!) {
                                            HStack {
                                                Text("View on Etherscan")
                                                    .foregroundColor(.blue)
                                                Image(systemName: "arrow.up.right.square")
                                                    .font(.system(size: 12))
                                            }
                                        }
                                        
                                        Text(hash)
                                            .font(.system(.caption, design: .monospaced))
                                            .foregroundColor(.gray)
                                            .lineLimit(1)
                                            .truncationMode(.middle)
                                    }
                                    .padding()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color(uiColor: .tertiarySystemBackground))
                                    .cornerRadius(12)
                                }
                            }
                            .padding()
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
                                    viewModel.getBalance()
                                }) {
                                    Text("Fetch Latest Balance")
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding()
                                }
                                Divider()
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
                                .blur(radius: isPrivateKeyVisible ? 0 : 8)
                                .overlay(
                                    Group {
                                        if !isPrivateKeyVisible {
                                            Text("Tap to reveal")
                                                .foregroundColor(.blue)
                                                .font(.system(size: 14))
                                        }
                                    }
                                )
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color(uiColor: .secondarySystemBackground))
                                .cornerRadius(12)
                                .padding(.horizontal)
                                .onTapGesture {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        isPrivateKeyVisible.toggle()
                                    }
                                }
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
