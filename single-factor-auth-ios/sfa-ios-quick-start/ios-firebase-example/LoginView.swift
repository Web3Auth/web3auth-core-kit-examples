import SwiftUI

struct LoginView: View {
    @StateObject var vm: ViewModel
    var body: some View {
        VStack(alignment: .leading) {
            
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
                    .frame(height: 44)
                    .background(Color.black)
                    .cornerRadius(25)
                }
            )
            .padding(.horizontal)
            
            Spacer()
        }
        .background(Color(uiColor: .systemBackground))
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView(vm: ViewModel())
    }
}
