import Foundation
import SingleFactorAuth
import JWTDecode
import FirebaseCore
import FirebaseAuth
import GoogleSignIn

class LoginModel: ObservableObject {
    @Published var loggedIn: Bool = false
    @Published var isLoading = false
    @Published var navigationTitle: String = ""
    @Published var userData: TorusKey!

    func setup() async {
        await MainActor.run(body: {
            isLoading = true
            navigationTitle = "Loading"
        })
        await MainActor.run(body: {
            if self.userData != nil {
                loggedIn = true
            }
            isLoading = false
            navigationTitle = loggedIn ? "UserInfo" : "SignIn"
        })
    }

    func loginWithCustomAuth() {
        Task {
            let res = try await Auth.auth().signIn(withEmail: "custom+jwt@firebase.login", password: "Testing@123")
            let id_token = try await res.user.getIDToken()
            let jwt = try decode(jwt: id_token)
            let result = try await SingleFactorAuth(singleFactorAuthArgs: .init(network: .TESTNET)).getKey(loginParams: .init(verifier: "web3auth-firebase-examples", verifierId: jwt.subject ?? "", idToken: id_token))
            await MainActor.run(body: {
                self.userData = result
                loggedIn = true
            })
        }
    }
    
    func loginWithGoogleFirebase() {
        Task {
            guard let clientID = FirebaseApp.app()?.options.clientID else { return }
            let config = GIDConfiguration(clientID: clientID)
            GIDSignIn.sharedInstance.configuration = config
            
            guard let windowScene = await UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = await windowScene.windows.first,
                  let rootViewController = await window.rootViewController else {
                print("There is no root view controller")
                return
            }
            
            let userAuthentication = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)
            let user = userAuthentication.user
            guard let idToken = user.idToken else {
                throw "ID Token missing"
            }
            let accessToken = user.accessToken
            let credential = GoogleAuthProvider.credential(withIDToken: idToken.tokenString, accessToken: accessToken.tokenString)
            let result = try await Auth.auth().signIn(with: credential)
            let firebaseUser = result.user
            let firebaseIdToken = try await firebaseUser.getIDToken();
            
            let jwt = try decode(jwt: firebaseIdToken)
            let resultFromFirebase = try await SingleFactorAuth(singleFactorAuthArgs: .init(network: .TESTNET)).getKey(loginParams: .init(verifier: "web3auth-firebase-examples", verifierId: jwt.subject ?? "", idToken: firebaseIdToken))
            await MainActor.run(body: {
                self.userData = resultFromFirebase
                loggedIn = true
            })
        }
    }

}
