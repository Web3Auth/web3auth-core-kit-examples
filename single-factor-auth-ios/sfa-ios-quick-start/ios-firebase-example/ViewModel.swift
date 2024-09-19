import Foundation
// IMP START - Quick Start
import SingleFactorAuth
// IMP END - Quick Start
// IMP START - Auth Provider Login
import FirebaseCore
import FirebaseAuth
// IMP END - Auth Provider Login

class ViewModel: ObservableObject {
    // IMP START - Installation
    var singleFactorAuth: SingleFactorAuth!
    var singleFactorAuthArgs: SFAParams!
    var ethereumClient: EthereumClient!
    var userBalance: String!
    
    // IMP END - Installation
    @Published var loggedIn: Bool = false
    @Published var user: String = ""
    @Published var isLoading = false
    @Published var navigationTitle: String = ""
    @Published var isAccountReady: Bool = false
    
    
    func setup() async {
        guard singleFactorAuth == nil else { return }
        await MainActor.run(body: {
            isLoading = true
            navigationTitle = "Loading"
        })
        
        // IMP START - Initialize Web3Auth SFA
        singleFactorAuthArgs = SFAParams(web3AuthClientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ", network: .sapphire(.SAPPHIRE_MAINNET))
        singleFactorAuth = try! SingleFactorAuth(params: singleFactorAuthArgs)
        
        // IMP END - Initialize Web3Auth SFA
        await MainActor.run(body: {
            isLoading = false
            navigationTitle = loggedIn ? "UserInfo" : "iOS SFA QuickStart"
        })
    }
    
    func loginViaFirebaseEP() {
        Task{
            do {
                // IMP START - Auth Provider Login
                let res = try await Auth.auth().signIn(withEmail: "ios@firebase.com", password: "iOS@Web3Auth")
                let id_token = try await res.user.getIDToken()
                // IMP END - Auth Provider Login
                print(id_token)
                // IMP START - Verifier Creation
                let verifierName = "w3a-firebase-demo"
                // IMP END - Verifier Creation
                // IMP START - Get Key
                let result = try await singleFactorAuth.connect(
                    loginParams: .init(
                        verifier: verifierName,
                        verifierId: res.user.uid,
                        idToken: id_token
                    )
                )
                // IMP END - Get Key
                print(result)
                ethereumClient = EthereumClient(user: result)
                getBalance()
                
                await MainActor.run(body: {
                    user = result.getPrivateKey()
                    loggedIn = true
                    navigationTitle = "UserInfo"
                })
                
            } catch {
                print("Error")
            }
        }
    }
    
    func getBalance() {
        Task {
            do  {
                self.userBalance = try await ethereumClient.getBalance()
                await MainActor.run(body: {
                    self.isAccountReady = true
                })
            } catch let error {
                print(error)
                await MainActor.run(body: {
                    self.isAccountReady = true
                })
            }
        }
    }
    
    func signMessage(onSigned: @escaping (_ signedMessage: String?, _ error: String?) -> ()){
        Task {
            do {
                let signature = try ethereumClient.signMessage()
                onSigned(signature, nil)
            } catch let error  {
                onSigned(nil, error.localizedDescription)
            }
        }
    }
    
    
}

extension ViewModel {
    func showResult(result: SFAKey) {
        print("""
        Signed in successfully!
            Private key: \(result.getPrivateKey())
            Public Address:
                Name: \(result.getPublicAddress())
        """)
    }
}
