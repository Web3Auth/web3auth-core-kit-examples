import SwiftUI

struct LoginView: View {
    @State var clicked: Bool = false
    @StateObject var vm: LoginModel

    var body: some View {
        List {
            Button(
                action: {
                        // TODO: This should go to loading view until login is completed, should return to this view on cancel/error, go to threshold key view on success.
                        clicked = true
                        vm.loginWithCustomAuth()
                },
                label: {
                    Text("Sign In With Google via Firebase")
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
