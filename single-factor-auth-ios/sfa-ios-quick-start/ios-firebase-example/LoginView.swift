import SwiftUI

struct LoginView: View {
    @StateObject var vm: ViewModel
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // X Logo
            Text("X")
                .font(.system(size: 48, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 80, height: 80)
                .background(Color.black)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            
            // Title and Subtitle
            VStack(spacing: 16) {
                Text("SFA Swift - X Demo")
                    .font(.system(size: 32, weight: .bold))
                    .multilineTextAlignment(.center)
                
                Text("Authenticate with your X account")
                    .font(.title2)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            Spacer()
            
            // Login Button
            Button(
                action: {
                    vm.loginViaFirebaseEP()
                },
                label: {
                    HStack(spacing: 12) {
                        if vm.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "arrow.right")
                                .foregroundColor(.white)
                                .font(.system(size: 16, weight: .semibold))
                        }
                        Text("Log in with X")
                            .foregroundColor(.white)
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(Color.black)
                    .cornerRadius(26)
                }
            )
            .padding(.horizontal, 24)
            
            // Bottom Links
            HStack(spacing: 40) {
                Button("Need help?") {
                    // Add help action
                }
                
                Button("Privacy Policy") {
                    // Add privacy policy action
                }
            }
            .font(.system(size: 16))
            .foregroundColor(.secondary)
            .padding(.top, 24)
            .padding(.bottom, 40)
        }
        .background(Color(uiColor: .systemBackground))
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView(vm: ViewModel())
    }
}