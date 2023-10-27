import SwiftUI

struct LoginView: View {
    @State var clicked: Bool = false
    @StateObject var vm: LoginModel

    var body: some View {
        List {
            Text("Aggregate Verifier Example")
            Button(
                action: {
                        // TODO: This should go to loading view until login is completed, should return to this view on cancel/error, go to threshold key view on success.
                        clicked = true
                        vm.loginWithGoogle()
                },
                label: {
                    Text("Sign In With Google")
                }
            ).disabled(clicked)
            Button(
                action: {
                        clicked = true
                        vm.loginWithGitHub()
                },
                label: {
                    Text("Sign In With GitHub")
                }
            ).disabled(clicked)
            Button(
                action: {
                        clicked = true
                        vm.loginWithDiscord()
                },
                label: {
                    Text("Sign In With Discord")
                }
            ).disabled(clicked)
        }
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView(vm: LoginModel())
    }
}
