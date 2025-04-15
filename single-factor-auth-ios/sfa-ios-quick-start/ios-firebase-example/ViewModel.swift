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
    var web3AuthOptions: Web3AuthOptions!
    var ethereumClient: EthereumClient!
    var userBalance: String = "0.0"
    var userAccount: String = "0x0"
    
    // IMP END - Installation
    @Published var loggedIn: Bool = false
    @Published var user: String = ""
    @Published var isLoading = false
    @Published var navigationTitle: String = ""
    @Published var isAccountReady: Bool = false
    
    var chainConfig: ChainConfig = ChainConfig(chainId: "0xaa36a7", rpcTarget: "https://api.web3auth.io/infura-service/v1/11155111/BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ")
    
    init() {
        Task {
            await setup()
        }
    }
    
    func setup() async {
        guard singleFactorAuth == nil else { return }
        await MainActor.run(body: {
            isLoading = true
            navigationTitle = "Loading"
        })
        
        // IMP START - Initialize Web3Auth SFA
        web3AuthOptions = Web3AuthOptions(
            clientId: "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ",
            web3AuthNetwork: .SAPPHIRE_MAINNET,
            redirectUrl: "w3a.sfa.ios://auth"
        )
        
        singleFactorAuth = try! SingleFactorAuth(params: web3AuthOptions)
        
        do {
            try await singleFactorAuth.initialize()
        } catch let error {
            // Handle Error
            print("Initialize Error: " + error.localizedDescription)
        }
        
        // Check for existing session
        if(singleFactorAuth.getSessionData() != nil) {
            let sessionData = singleFactorAuth.getSessionData()!
            ethereumClient = EthereumClient(sessionData: sessionData)
            getBalance()
            
            await MainActor.run(body: {
                user = sessionData.privateKey
                loggedIn = true
                navigationTitle = "Profile"
            })
        }
        
        await MainActor.run(body: {
            isLoading = false
            navigationTitle = loggedIn ? "Profile" : ""
        })
    }
    
    func loginViaFirebaseX() {
        Task {
            do {
                await MainActor.run {
                    isLoading = true
                }
                
                // Twitter OAuth Provider Setup
                let provider = OAuthProvider(providerID: "twitter.com")

                // Use async version to get credential
                let credential: AuthCredential = try await withCheckedThrowingContinuation { continuation in
                    provider.getCredentialWith(nil) { credential, error in
                        if let error = error {
                            continuation.resume(throwing: error)
                        } else if let credential = credential {
                            continuation.resume(returning: credential)
                        } else {
                            continuation.resume(throwing: NSError(domain: "FirebaseAuth", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unknown error getting credential"]))
                        }
                    }
                }

                // Sign in with Twitter credential
                let authResult = try await Auth.auth().signIn(with: credential)
                let idToken = try await authResult.user.getIDToken()
                guard let uid = authResult.user.uid as String?, idToken as String? != nil else {
                    throw NSError(domain: "FirebaseAuth", code: -2, userInfo: [NSLocalizedDescriptionKey: "Missing UID, or Id Token missing"])
                }

                // Verifier name
                let verifierName = "w3a-firebase-demo"

                // Get Web3Auth key
                let result = try await singleFactorAuth.connect(
                    loginParams: .init(
                        verifier: verifierName,
                        verifierId: uid,
                        idToken: idToken
                    )
                )

                // Continue with Ethereum client setup and UI update
                ethereumClient = EthereumClient(sessionData: result)
                getBalance()

                await MainActor.run {
                    user = result.privateKey
                    loggedIn = true
                    navigationTitle = "Profile"
                    isLoading = false
                }

            } catch {
                print("Login error: \(error.localizedDescription)")
                await MainActor.run {
                    isLoading = false
                }
            }
        }
    }

    func loginViaFirebaseAnonymous() {
        Task {
            do {
                await MainActor.run {
                    isLoading = true
                }

                // IMP START - Auth Provider Login
                let res = try await Auth.auth().signIn(withEmail: "ios@firebase.com", password: "iOS@Web3Auth")
                let id_token = try await res.user.getIDToken()
                // IMP END - Auth Provider Login
                
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

                // Continue with Ethereum client setup and UI update
                ethereumClient = EthereumClient(sessionData: result)
                getBalance()

                await MainActor.run {
                    user = result.privateKey
                    loggedIn = true
                    navigationTitle = "Profile"
                    isLoading = false
                }

            } catch {
                print("Login error: \(error)")
                await MainActor.run {
                    isLoading = false
                }
            }
        }
    }

    func showWalletUI() {
        Task {
            
            do {
                try await singleFactorAuth.showWalletUI(chainConfig: chainConfig)
            } catch {
                print(error.localizedDescription)
            }
        }
    }
    
    func requestSignature(onSigned: @escaping (_ signedMessage: String?, _ error: String?) -> ()) {
        Task {
            do {
                let sessionData = singleFactorAuth.getSessionData()
                var params = [Any]()
                  // Message to be signed
                  params.append("Hello, Web3Auth from iOS!")
                  // User's EOA address
                  params.append(sessionData!.publicAddress)
                
                let response = try await singleFactorAuth.request(
                    chainConfig: chainConfig,
                    method: "personal_sign",
                    requestParams: params
                )
                
                if response.success {
                    onSigned(response.result, nil)
                } else {
                    onSigned(nil, response.error)
                }
            } catch {
                onSigned(nil, error.localizedDescription)
            }
        }
    }
    
    func getBalance() {
        Task {
            do  {
                let sessionData = singleFactorAuth.getSessionData()
                self.userAccount = sessionData!.publicAddress
                self.userBalance = try await ethereumClient.getBalance()
                print("Balance of \(self.userAccount): \(self.userBalance)")
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
    
    func logout() {
        Task {
            do  {
                try await singleFactorAuth.logout();
                try Auth.auth().signOut();
                await MainActor.run(body: {
                    self.loggedIn = false
                    navigationTitle = loggedIn ? "Profile" : ""
                })
            } catch let error {
                print(error)
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
    
    func sendTransaction(to address: String, amount: String, completion: @escaping (Bool, String?, String?) -> Void) {
        Task {
            do {
                guard let amountInWei = try? convertEthToWei(amount) else {
                    completion(false, "Invalid amount", nil)
                    return
                }
                
                let sessionData = singleFactorAuth.getSessionData()
                // Create transaction object
                let transaction: [String: Any] = [
                    "from": sessionData!.publicAddress,
                    "to": address,
                    "value": amountInWei,
                    "data": "0x"
                ]
                
                let response = try await singleFactorAuth.request(
                    chainConfig: chainConfig,
                    method: "eth_sendTransaction",
                    requestParams: [transaction] // Send as array with single transaction object
                )
                
                if response.success {
                    // response.result contains the transaction hash
                    completion(true, nil, response.result)
                    // Refresh balance after successful transaction
                    getBalance()
                } else {
                    completion(false, response.error, nil)
                }
            } catch {
                completion(false, error.localizedDescription, nil)
            }
        }
    }
    
    private func convertEthToWei(_ eth: String) throws -> String {
        guard let ethValue = Double(eth) else {
            throw NSError(domain: "Transaction", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid amount"])
        }
        let weiValue = ethValue * 1e18
        return String(format: "0x%llx", UInt64(weiValue))
    }
}

extension ViewModel {
    func showResult(result: SessionData) {
        print("""
        Signed in successfully!
            Private key: \(result.privateKey)
            Public Address:
                Name: \(result.publicAddress)
        """)
    }
}
