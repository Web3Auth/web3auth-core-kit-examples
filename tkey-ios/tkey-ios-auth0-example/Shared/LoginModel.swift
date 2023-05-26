import Foundation
import CustomAuth

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
            let sub = SubVerifierDetails(loginType: .web,
                                         loginProvider: .jwt,
                                         clientId: "294QRkchfq2YaXUbPri7D6PH7xzHgQMT",
                                         verifier: "web3auth-auth0-example",
                                         redirectURL: "tdsdk://tdsdk/oauthCallback",
                                         browserRedirectURL: "https://scripts.toruswallet.io/redirect.html",
                                         jwtParams: ["domain" : "shahbaz-torus.us.auth0.com", "verifier_id_field": "sub"])
            let tdsdk = CustomAuth(aggregateVerifierType: .singleLogin, aggregateVerifier: "web3auth-auth0-example", subVerifierDetails: [sub], network: .TESTNET)
            let data = try await tdsdk.triggerLogin()
            await MainActor.run(body: {
                self.userData = data
                loggedIn = true
            })
        }
    }

}
