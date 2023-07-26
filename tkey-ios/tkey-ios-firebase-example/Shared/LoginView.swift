import SwiftUI

struct LoginView: View {
    @State var clicked: Bool = false
    @StateObject var vm: LoginModel

    var body: some View {
        VStack {
            if !clicked {
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
            } else {
                LoadingView()
            }
        }
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView(vm: LoginModel())
    }
}

struct LoadingView: View {
    var body: some View {
        ZStack{
            Color(.systemBackground)
                .ignoresSafeArea()
            
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                .scaleEffect(3)
        }
    }
}
