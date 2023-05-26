import Foundation
import CustomAuth
import FirebaseCore
import FirebaseAuth
import JWTDecode

class LoginModel: ObservableObject {
    @Published var loggedIn: Bool = false
    @Published var isLoading = false
    @Published var navigationTitle: String = ""
    @Published var userData: [String: Any]!

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
            let sub = SubVerifierDetails(loginType: .web,
                                         loginProvider: .jwt,
                                         clientId: "BHr_dKcxC0ecKn_2dZQmQeNdjPgWykMkcodEHkVvPMo71qzOV6SgtoN8KCvFdLN7bf34JOm89vWQMLFmSfIo84A",
                                         verifier: "web3auth-firebase-examples",
                                         redirectURL: "tdsdk://tdsdk/oauthCallback",
                                         browserRedirectURL: "https://scripts.toruswallet.io/redirect.html")
            let tdsdk = CustomAuth(aggregateVerifierType: .singleLogin, aggregateVerifier: "web3auth-firebase-examples", subVerifierDetails: [sub], network: .TESTNET)
            let data = try await tdsdk.getTorusKey(verifier: "web3auth-firebase-examples", verifierId: jwt.subject ?? "", idToken: id_token)
            await MainActor.run(body: {
                self.userData = data
                loggedIn = true
            })
        }
    }

}
