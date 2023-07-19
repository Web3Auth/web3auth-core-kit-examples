import Foundation
import Web3Auth
import SingleFactorAuth
import FirebaseCore
import FirebaseAuth
import JWTDecode

class ViewModel: ObservableObject {
    var web3Auth: Web3Auth?
    var singleFactorAuth: SingleFactorAuth?
    @Published var loggedIn: Bool = false
    @Published var user: String = ""
    @Published var isLoading = false
    @Published var navigationTitle: String = ""
//    private var clientId = "BEglQSgt4cUWcj6SKRdu5QkOXTsePmMcusG5EAoyjyOYKlVRjIF1iCNnMOTfpzCiunHRrMui8TIwQPXdkQ8Yxuk"
//    private var network: Network = .cyan
    func setup() async {
        guard singleFactorAuth == nil else { return }
        await MainActor.run(body: {
            isLoading = true
            navigationTitle = "Loading"
        })
//        web3Auth = await Web3Auth(.init(clientId: clientId, network: network))
        singleFactorAuth = SingleFactorAuth(singleFactorAuthArgs: .init(network: .CYAN))
        await MainActor.run(body: {
            if self.web3Auth?.state != nil {
                user = ""
                loggedIn = true
            }
            isLoading = false
            navigationTitle = loggedIn ? "UserInfo" : "SignIn"
        })
    }
    
    func loginViaFirebaseEP() {
        Task{
            do {
                let res = try await Auth.auth().signIn(withEmail: "ios@firebase.com", password: "iOS@Web3Auth")
                let id_token = try await res.user.getIDToken()
                let jwt = try decode(jwt: id_token)
//                let result = try await Web3Auth(.init(
//                    clientId: clientId,
//                    network: network,
//                    loginConfig: [
//                        TypeOfLogin.jwt.rawValue:
//                                .init(
//                                    verifier: "web3auth-firebase-examples",
//                                    typeOfLogin: .jwt
//                                )
//                    ]
//                )).login(
//                    W3ALoginParams(
//                    loginProvider: .JWT,
//                    dappShare: nil,
//                    extraLoginOptions: ExtraLoginOptions(display: nil, prompt: nil, max_age: nil, ui_locales: nil, id_token_hint: nil, id_token: id_token, login_hint: nil, acr_values: nil, scope: nil, audience: nil, connection: nil, domain: nil, client_id: nil, redirect_uri: nil, leeway: nil, verifierIdField: "sub", isVerifierIdCaseSensitive: nil),
//                    mfaLevel: .NONE,
//                    curve: .SECP256K1
//                    ))
                let result = try await SingleFactorAuth(singleFactorAuthArgs: .init(network: .CYAN)).getKey(loginParams: .init(verifier: "web3auth-firebase-examples", verifierId: jwt.subject ?? "", idToken: id_token))
                print(result)
                await MainActor.run(body: {
                    user = result.getPrivateKey()
                    loggedIn = true
                })

            } catch {
                print("Error")
            }
        }
    }
    
    
}

extension ViewModel {
    func showResult(result: TorusKey) {
        print("""
        Signed in successfully!
            Private key: \(result.getPrivateKey())
            Public Address:
                Name: \(result.getPublicAddress())
        """)
    }
}
