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

    func loginWithGoogle() {
        Task {
            let sub = SubVerifierDetails(loginType: .web,
                                         loginProvider: .google,
                                         clientId: "774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com",
                                         verifier: "w3a-google",
                                         redirectURL: "tdsdk://tdsdk/oauthCallback",
                                         browserRedirectURL: "https://scripts.toruswallet.io/redirect.html")
            let tdsdk = CustomAuth(aggregateVerifierType: .singleIdVerifier, aggregateVerifier: "w3a-agg-example", subVerifierDetails: [sub], network: .TESTNET)
            let data = try await tdsdk.triggerLogin()
            await MainActor.run(body: {
                self.userData = data
                loggedIn = true
            })
        }
    }
    
    func loginWithGitHub() {
        Task {
            let sub = SubVerifierDetails(loginType: .web,
                                         loginProvider: .jwt,
                                         clientId: "hiLqaop0amgzCC0AXo4w0rrG9abuJTdu",
                                         verifier: "w3a-a0-github",
                                         redirectURL: "tdsdk://tdsdk/oauthCallback",
                                         browserRedirectURL: "https://scripts.toruswallet.io/redirect.html",
                                         jwtParams: ["domain" : "web3auth.au.auth0.com", "verifier_id_field": "email"])

            let tdsdk = CustomAuth(aggregateVerifierType: .singleIdVerifier, aggregateVerifier: "w3a-agg-example", subVerifierDetails: [sub], network: .TESTNET)
            let data = try await tdsdk.triggerLogin()
            await MainActor.run(body: {
                self.userData = data
                loggedIn = true
            })
        }
    }
    
    func loginWithDiscord() {
        Task {
            let sub = SubVerifierDetails(loginType: .web,
                                         loginProvider: .jwt,
                                         clientId: "G5dokkUjwlUE00FWP4pR3z9m2ZPrDAmF",
                                         verifier: "w3a-a0-discord",
                                         redirectURL: "tdsdk://tdsdk/oauthCallback",
                                         browserRedirectURL: "https://scripts.toruswallet.io/redirect.html",
                                         jwtParams: ["domain" : "web3auth.au.auth0.com", "verifier_id_field": "email"])
            let tdsdk = CustomAuth(aggregateVerifierType: .singleIdVerifier, aggregateVerifier: "w3a-agg-example", subVerifierDetails: [sub], network: .TESTNET)
            let data = try await tdsdk.triggerLogin()
            await MainActor.run(body: {
                self.userData = data
                loggedIn = true
            })
        }
    }

}
