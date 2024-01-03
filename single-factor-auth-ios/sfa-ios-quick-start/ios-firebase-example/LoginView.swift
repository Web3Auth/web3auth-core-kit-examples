import SwiftUI

struct LoginView: View {
    @StateObject var vm: ViewModel
    var body: some View {
        List {
            Button(
                action: {
                    vm.loginViaFirebaseEP()
                },
                label: {
                    Label("LogIn", systemImage: "arrow.right.square.fill")
                        .foregroundColor(.green)
                }
            )

        }
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView(vm: ViewModel())
    }
}
