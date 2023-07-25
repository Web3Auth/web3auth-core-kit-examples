import SwiftUI

struct LoginView: View {
    @State var clicked: Bool = false
    @StateObject var vm: LoginModel

    var body: some View {
        List {
            Button(
                action: {
                        clicked = true
                        vm.loginWithCustomAuth()
                },
                label: {
                    Text("SignIn with JWT via Firebase")
                }
            ).disabled(clicked)
            Button(
                action: {
                        clicked = true
                        vm.loginWithGoogleFirebase()
                },
                label: {
                    Text("SignIn with Google via Firebase")
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
