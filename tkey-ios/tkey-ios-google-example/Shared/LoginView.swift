import SwiftUI

struct LoginView: View {
    @State var clicked: Bool = false
    @StateObject var vm: LoginModel

    var body: some View {
        List {
            if vm.isLoading {
                LoaderView()
            } else {
                Button(
                    action: {
                            // TODO: This should go to loading view until login is completed, should return to this view on cancel/error, go to threshold key view on success.
                            vm.loginWithCustomAuth()
                    },
                    label: {
                        Text("Sign In With Google")
                    }
                ).disabled(vm.isLoading)

            }

        }
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView(vm: LoginModel())
    }
}
