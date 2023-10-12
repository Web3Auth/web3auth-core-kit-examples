import SwiftUI
import tkey_pkg

enum SpinnerLocation {
    case add_password_btn, change_password_btn, init_reconstruct_btn, nowhere
}

struct ThresholdKeyView: View {
    @State var userData: [String: Any]
    @State private var showAlert = false
    @State private var alertContent = ""
    @State private var totalShares = 0
    @State private var threshold = 0
    @State private var reconstructedKey = ""
    @State private var shareIndexCreated = ""
    @State private var phrase = ""
    @State private var tkeyInitalized = false
    @State private var tkeyReconstructed = false
    @State private var resetAccount = true
    @State var threshold_key: ThresholdKey!
    @State var shareCount = 0
    @State private var showInputPasswordAlert = false
    @State private var showChangePasswordAlert = false
    @State private var password = ""
    @State private var showSpinner = SpinnerLocation.nowhere

    func resetAppState() {
        totalShares = 0
        threshold = 0
        reconstructedKey = ""
        shareIndexCreated = ""
        phrase = ""
        tkeyInitalized = false
        tkeyReconstructed = false
        resetAccount = true
        // remove any data saved to keychain for this app
        // TODO: remove data for affected account
        let secItemClasses = [kSecClassGenericPassword,
            kSecClassInternetPassword,
            kSecClassCertificate,
            kSecClassKey,
            kSecClassIdentity]
        for secItemClass in secItemClasses {
            let dictionary = [kSecClass as String: secItemClass]
            SecItemDelete(dictionary as CFDictionary)
        }
    }

    var body: some View {
        VStack {
            HStack {
                Image(systemName: "person")
                    .resizable()
                    .frame(width: 50, height: 50)
                VStack(alignment: .leading) {
                    Text("Reconstructed key: \(reconstructedKey)")
                        .font(.subheadline)
                    Text("total shares: \(totalShares)")
                        .font(.subheadline)
                    Text("threshold: \(threshold)")
                        .font(.subheadline)
                }
                Spacer()
            }
            .padding()
            List {
                Section(header: Text("Basic functionality")) {
                    HStack {
                        Text("Initialize and reconstruct tkey")
                        Spacer()
                        if showSpinner == SpinnerLocation.init_reconstruct_btn {
                            LoaderView()
                        }
                        Button(action: {
                            Task {
                                showSpinner = SpinnerLocation.init_reconstruct_btn

                                guard let fetchKey = userData["publicAddress"] as? String else {
                                    alertContent = "Failed to get public address from userinfo"
                                    showAlert = true
                                    showSpinner = SpinnerLocation.nowhere
                                    return
                                }

                                guard let postboxkey = userData["privateKey"] as? String else {
                                    alertContent = "Failed to get postboxkey"
                                    showAlert = true
                                    showSpinner = SpinnerLocation.nowhere
                                    return
                                }

                                guard let storage_layer = try? StorageLayer(enable_logging: true, host_url: "https://metadata.tor.us", server_time_offset: 2) else {
                                    alertContent = "Failed to create storage layer"
                                    showAlert = true
                                    showSpinner = SpinnerLocation.nowhere
                                    return
                                }

                                guard let service_provider = try? ServiceProvider(enable_logging: true, postbox_key: postboxkey) else {
                                    alertContent = "Failed to create service provider"
                                    showAlert = true
                                    showSpinner = SpinnerLocation.nowhere
                                    return
                                }

                                guard let thresholdKey = try? ThresholdKey(
                                    storage_layer: storage_layer,
                                    service_provider: service_provider,
                                    enable_logging: true,
                                    manual_sync: false) else {
                                        alertContent = "Failed to create threshold key"
                                        showAlert = true
                                        showSpinner = SpinnerLocation.nowhere
                                        return
                                    }

                                threshold_key = thresholdKey

                                guard let key_details = try? await threshold_key.initialize(never_initialize_new_key: false, include_local_metadata_transitions: false) else {
                                    alertContent = "Failed to get key details"
                                    showAlert = true
                                    showSpinner = SpinnerLocation.nowhere
                                    return
                                }

                                totalShares = Int(key_details.total_shares)
                                threshold = Int(key_details.threshold)
                                tkeyInitalized = true

                                // fetch all locally available shares for this google account
                                var shares: [String] = []
                                shareCount = 0
                                var finishedFetch = false
                                repeat {
                                    let fetchId = fetchKey + ":" + String(shareCount)
                                    do {
                                        let share = try KeychainInterface.fetch(key: fetchId)
                                        shares.append(share)
                                    } catch {
                                        finishedFetch = true
                                        break
                                    }
                                    shareCount += 1
                                } while !finishedFetch
                                // There are 0 locally available shares for this tkey
                                if shareCount == 0 {
                                    guard let reconstructionDetails = try? await threshold_key.reconstruct() else {
                                        alertContent = "Failed to reconstruct key. \(key_details.required_shares) more share(s) required. If you have security question share, we suggest you to enter security question PW to recover your account"
                                        resetAccount = true
                                        showAlert = true
                                        showSpinner = SpinnerLocation.nowhere
                                        return
                                    }
                                    var shareIndexes = try threshold_key.get_shares_indexes()
                                    shareIndexes.removeAll(where: {$0 == "1"})
                                   
                                    let saveId = fetchKey + ":0"

                                    guard let share = try? thresholdKey.output_share(shareIndex: shareIndexes[0], shareType: nil) else {
                                        alertContent = "Failed to output share"
                                        resetAccount = true
                                        showAlert = true
                                        showSpinner = SpinnerLocation.nowhere
                                        return
                                    }


                                    guard let _ = try? KeychainInterface.save(item: share, key: saveId) else {
                                        alertContent = "Failed to save share"
                                        resetAccount = true
                                        showAlert = true
                                        showSpinner = SpinnerLocation.nowhere
                                        return
                                    }
                                    
                                
                                    guard let reconstructionDetails = try? await threshold_key.reconstruct() else {
                                        alertContent = "Failed to reconstruct key. \(key_details.required_shares) more share(s) required."
                                        resetAccount = true
                                        showAlert = true
                                        return
                                    }

                                    reconstructedKey = reconstructionDetails.key
                                    alertContent = "\(reconstructedKey) is the private key"
                                    showAlert = true
                                    tkeyReconstructed = true
                                    resetAccount = false
                                    showSpinner = SpinnerLocation.nowhere
                                }
                                // existing account
                                else {
                                    // import shares
                                    for item in shares {
                                        do {
                                            _ = try await threshold_key.input_share(share: item, shareType: nil)
                                        } catch {
                                            alertContent = "Incorrect share was used."
                                            showAlert = true
                                            resetAccount = true
                                            showSpinner = SpinnerLocation.nowhere
                                            return
                                        }
                                    }

                                    guard let reconstructionDetails = try? await threshold_key.reconstruct() else {
                                        
                                        alertContent = "Failed to reconstruct key with available shares."
                                        resetAccount = true
                                        showAlert = true
                                        showSpinner = SpinnerLocation.nowhere
                                        return
                                    }

                                    reconstructedKey = reconstructionDetails.key
                                    alertContent = "\(reconstructedKey) is the private key"
                                    showAlert = true
                                    tkeyReconstructed = true
                                    resetAccount = false
                                }
                                showSpinner = SpinnerLocation.nowhere
                            }
                        }) {
                            Text("")
                        }
                        .disabled(showSpinner == SpinnerLocation.init_reconstruct_btn)
                        .opacity(showSpinner == SpinnerLocation.init_reconstruct_btn ? 0.5 : 1)
                        .alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }
                    
                    HStack {
                        Text("Enter SecurityQuestion password and reconstruct tkey & save share locally")
                        Spacer()
                        Button(action: {
                            let alert = UIAlertController(title: "Enter Password", message: nil, preferredStyle: .alert)
                            alert.addTextField { textField in
                                textField.placeholder = "Password"
                            }
                            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
                            alert.addAction(UIAlertAction(title: "OK", style: .default, handler: { [weak alert] _ in
                                guard let textField = alert?.textFields?.first, let answer = textField.text else { return }
                                Task {
                                    do {
                                        guard let result = try? await SecurityQuestionModule.input_share(threshold_key: threshold_key, answer: answer) else {
                                            alertContent = "input share failed. Make sure threshold key is initialized"
                                            showAlert = true
                                            return
                                        }
                                        if result {
                                            // save this share locally
                                            let shareIndexes = try threshold_key.get_shares_indexes()
                                            
                                            // let's get the device share index
                                            var securityQuestionShareIndex = ""
                                            if shareIndexes[0] == "1" {
                                                securityQuestionShareIndex = shareIndexes[1]
                                            } else {
                                                securityQuestionShareIndex = shareIndexes[0]
                                            }
                                            
                                            let share = try threshold_key.output_share(shareIndex: securityQuestionShareIndex, shareType: nil)
                                            
                                            guard let fetchKey = userData["publicAddress"] as? String else {
                                                alertContent = "Failed to get public address from userinfo"
                                                showAlert = true
                                                return
                                            }
                                            
                                            let saveId = fetchKey + ":" + String(shareCount)
                                            //save the security question share locally
                                            try KeychainInterface.save(item: share, key: saveId)
                                            
                                            guard let detail = try? await threshold_key.reconstruct() else {
                                                
                                                alertContent = "Failed to reconstruct key."
                                                resetAccount = true
                                                showAlert = true
                                                showSpinner = SpinnerLocation.nowhere
                                                return
                                            }
                                            reconstructedKey = detail.key
                                            alertContent = "\(reconstructedKey) is the private key"
                                            showAlert = true
                                            tkeyReconstructed = true
                                            resetAccount = false
                                            
                                        } else {
                                            alertContent = "password incorrect"
                                        }
                                    } catch {
                                        alertContent = "Password share input failed"
                                    }
                                    showAlert = true
                                }
                            }))
                            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                                windowScene.windows.first?.rootViewController?.present(alert, animated: true, completion: nil)
                            }
                        }) {
                                Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }.disabled(!tkeyInitalized)
                        .opacity(!tkeyInitalized ? 0.5 : 1)

                    
                    HStack {
                        Text("Get key details")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let key_details = try threshold_key.get_key_details()
                                    totalShares = Int(key_details.total_shares)
                                    threshold = Int(key_details.threshold)
                                    alertContent = "There are \(totalShares) available shares. \(key_details.required_shares) are required to reconstruct the private key"
                                showAlert = true
                                    showAlert = true
                                } catch {
                                    alertContent = "get key details failed"
                                    showAlert = true
                                }

                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }.disabled(!tkeyInitalized)
                        .opacity(!tkeyInitalized ? 0.5 : 1)

                    HStack {
                        Text("Generate new share")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let shares = try await threshold_key.generate_new_share()
                                    let index = shares.hex
                                    let key_details = try threshold_key.get_key_details()
                                    totalShares = Int(key_details.total_shares)
                                    threshold = Int(key_details.threshold)
                                    shareIndexCreated = index
                                    alertContent = "You have \(totalShares) shares. New share with index, \(index) was created"
                                    showAlert = true
                                } catch {
                                    alertContent = "generate new share failed"
                                    showAlert = true
                                }
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }.disabled(!tkeyReconstructed)
                        .opacity(!tkeyReconstructed ? 0.5 : 1)

                    HStack {
                        Text("Delete share")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    try await threshold_key.delete_share(share_index: shareIndexCreated)
                                    let key_details = try threshold_key.get_key_details()
                                    totalShares = Int(key_details.total_shares)
                                    threshold = Int(key_details.threshold)
                                    alertContent = "You have \(totalShares) shares. Share index, \(shareIndexCreated) was deleted"
                                } catch {
                                    alertContent = "Delete share failed"
                                }

                                showAlert = true
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }

                    }.disabled(!tkeyReconstructed)
                        .opacity(!tkeyReconstructed ? 0.5 : 1)

                    HStack {
                        Text("Reset account")
                        Spacer()
                        Button(action: {
                            let alert = UIAlertController(title: "Reset Account", message: "This action will reset your account. Use it with extreme caution.", preferredStyle: .alert)
                            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
                            alert.addAction(UIAlertAction(title: "Reset", style: .destructive, handler: { _ in
                                Task {
                                    showAlert = true
                                    alertContent = "Resetting your accuont.."
                                    do {
                                        let postboxkey = userData["privateKey"] as! String
                                        let temp_storage_layer = try StorageLayer(enable_logging: true, host_url: "https://metadata.tor.us", server_time_offset: 2)
                                        let temp_service_provider = try ServiceProvider(enable_logging: true, postbox_key: postboxkey)
                                        let temp_threshold_key = try ThresholdKey(
                                            storage_layer: temp_storage_layer,
                                            service_provider: temp_service_provider,
                                            enable_logging: true,
                                            manual_sync: false)

                                        try await temp_threshold_key.storage_layer_set_metadata(private_key: postboxkey, json: "{ \"message\": \"KEY_NOT_FOUND\" }")
                                        tkeyInitalized = false
                                        tkeyReconstructed = false
                                        resetAccount = false
                                        alertContent = "Account reset successful"

                                        resetAppState() // Allow reinitialize
                                    } catch {
                                        alertContent = "Reset failed"
                                    }

                                }
                            }))
                            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                                windowScene.windows.first?.rootViewController?.present(alert, animated: true, completion: nil)
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }

                }
                Section(header: Text("Security Question")) {
                    HStack {
                        Text("Add password")
                        Spacer()
                        if showSpinner == SpinnerLocation.add_password_btn {
                            LoaderView()
                        }
                        Button(action: {
                        Task {
                            showInputPasswordAlert.toggle()
                        }
                        }){
                            Text("")
                        }.alert("Enter Password", isPresented: $showInputPasswordAlert) {
                            SecureField("Password", text: $password)
                            Button("Save", action: {
                                Task {
                                    do {
                                        showSpinner = SpinnerLocation.add_password_btn
                                        let question = "what's your password?"
                                        let _ = try await SecurityQuestionModule.generate_new_share(threshold_key: threshold_key, questions: question, answer: password)

                                        let key_details = try threshold_key.get_key_details()
                                        totalShares = Int(key_details.total_shares)
                                        threshold = Int(key_details.threshold)

                                        alertContent = "New password share created with password: \(password)"
                                        password = ""
                                        showAlert = true
                                    } catch {
                                        alertContent = "Generate new share with password failed. It's because password share already exists, or execution went wrong"
                                        showAlert = true
                                    }
                                    showSpinner = SpinnerLocation.nowhere
                                }
                            })
                            Button("Cancel", role: .cancel){}
                        } message: {
                            Text("Enter the password and generate new security question share. Please set your password securely")
                        }
                        .alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                        .disabled(showSpinner == SpinnerLocation.change_password_btn)
                        .opacity(showSpinner == SpinnerLocation.change_password_btn ? 0.5 : 1)
                    
                    }
 
                     

                    HStack {
                        Text("Change password")
                        Spacer()
                        if showSpinner == SpinnerLocation.change_password_btn {
                            LoaderView()
                        }
                        Button(action: {

                        Task {
                            showChangePasswordAlert.toggle()
                        }
                        }) {
                            Text("")
                        }.alert("Change Password", isPresented: $showChangePasswordAlert) {
                            SecureField("New Password", text: $password)
                            Button("Save", action: {
                                Task {
                                    do {
                                        showSpinner = SpinnerLocation.change_password_btn
                                        let question = "what's your password?"
                                        let answer = password
                                        // reset the password var to empty. we would not want to keep secret in state for longer.
                                        password = ""
                                        _ = try await SecurityQuestionModule.change_question_and_answer(threshold_key: threshold_key, questions: question, answer: answer)
                                        let key_details = try threshold_key.get_key_details()
                                        totalShares = Int(key_details.total_shares)
                                        threshold = Int(key_details.threshold)

                                        alertContent = "Password changed to: \(answer)"
                                        showAlert = true
                                    } catch {
                                        alertContent = "An unexpected error occured while changing password."
                                        showAlert = true
                                    }
                                    showSpinner = SpinnerLocation.nowhere
                                }
                            })
                            Button("Cancel", role: .cancel) {}
                        } message: {
                            Text("Please enter new password")
                        }
                        .alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }

                        .disabled(showSpinner == SpinnerLocation.change_password_btn)
                        .opacity(showSpinner == SpinnerLocation.change_password_btn ? 0.5 : 1)
                    }

                    HStack {
                        Text("Show password")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let data = try SecurityQuestionModule.get_answer(threshold_key: threshold_key)
                                    let key_details = try threshold_key.get_key_details()
                                    totalShares = Int(key_details.total_shares)
                                    threshold = Int(key_details.threshold)
                                    alertContent = "Password is: \(data)"
                                    showAlert = true
                                } catch {
                                    alertContent = "show password failed"
                                    showAlert = true
                                }
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }
                }.disabled(!tkeyReconstructed)
                    .opacity(!tkeyReconstructed ? 0.5 : 1)
                Section(header: Text("seed phrase")) {
                    HStack {
                        Text("Set seed pharse")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let seedPhraseToSet = "seed sock milk update focus rotate barely fade car face mechanic mercy"
                                    try await SeedPhraseModule.set_seed_phrase(threshold_key: threshold_key, format: "HD Key Tree", phrase: seedPhraseToSet, number_of_wallets: 0)
                                    phrase = seedPhraseToSet
                                    alertContent = "set seed phrase complete"
                                } catch {
                                    alertContent = "set seed phrase failed"
                                }

                                showAlert = true
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }

                    HStack {
                        Text("Change seed pharse")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let seedPhraseToChange = "object brass success calm lizard science syrup planet exercise parade honey impulse"
                                    try await SeedPhraseModule.change_phrase(threshold_key: threshold_key, old_phrase: "seed sock milk update focus rotate barely fade car face mechanic mercy", new_phrase: seedPhraseToChange)
                                    phrase = seedPhraseToChange
                                    alertContent = "change seed phrase complete"
                                } catch {
                                    alertContent = "change seed phrase failed"
                                }
                                showAlert = true
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }

                    HStack {
                        Text("Get seed pharse")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let seedResult = try SeedPhraseModule.get_seed_phrases(threshold_key: threshold_key)
                                    if seedResult.isEmpty {
                                        alertContent = "No seed phrases set"
                                    } else {
                                        alertContent = "seed phrase is `\(seedResult[0].seedPhrase)`"
                                    }
                                } catch {
                                    alertContent = "Error: \(error.localizedDescription)"
                                }

                                showAlert = true
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }

                    HStack {
                        Text("Delete Seed phrase")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    try await SeedPhraseModule.delete_seed_phrase(threshold_key: threshold_key, phrase: phrase)
                                    phrase = ""
                                    alertContent = "delete seed phrase complete"
                                } catch {
                                    alertContent = "delete seed phrase failed"
                                }

                                showAlert = true
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }
                }.disabled(!tkeyReconstructed)
                    .opacity(!tkeyReconstructed ? 0.5 : 1)
                Section(header: Text("Share Serialization")) {
                    HStack {
                        Text("Export share")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let shareStore = try await threshold_key.generate_new_share()
                                    let index = shareStore.hex

                                    let key_details = try threshold_key.get_key_details()
                                    totalShares = Int(key_details.total_shares)
                                    threshold = Int(key_details.threshold)
                                    shareIndexCreated = index

                                    let shareOut = try threshold_key.output_share(shareIndex: index)

                                    let result = try ShareSerializationModule.serialize_share(threshold_key: threshold_key, share: shareOut)
                                    alertContent = "serialize result is \(result)"
                                    showAlert = true
                                } catch {
                                    alertContent = "Export share failed: \(error.localizedDescription)"
                                    showAlert = true
                                }
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }

                    }
                }.disabled(!tkeyReconstructed)
                    .opacity(!tkeyReconstructed ? 0.5 : 1)

                Section(header: Text("Private Key")) {
                    HStack {
                        Text("Set Private Key")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let key_module = try PrivateKey.generate()
                                    let result = try await PrivateKeysModule.set_private_key(threshold_key: threshold_key, key: key_module.hex, format: "secp256k1n")

                                    if result {
                                        alertContent = "Setting private key completed"
                                    } else {
                                        alertContent = "Setting private key failed"
                                    }
                                } catch {
                                    alertContent = "Error: \(error.localizedDescription)"
                                }
                                showAlert = true
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }

                    }

                    HStack {
                        Text("Get Private Key")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let result = try PrivateKeysModule.get_private_keys(threshold_key: threshold_key)
                                    alertContent = "Get private key result is \(result)"
                                } catch {
                                    alertContent = "Failed to get private key"
                                }
                                showAlert = true
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }

                    HStack {
                        Text("Get Accounts")
                        Spacer()
                        Button(action: {
                            Task {
                                do {
                                    let result = try PrivateKeysModule.get_private_key_accounts(threshold_key: threshold_key)
                                    alertContent = "Get accounts result is \(result)"
                                } catch {
                                    alertContent = "Failed to get accounts"
                                }
                                showAlert = true
                            }
                        }) {
                            Text("")
                        }.alert(isPresented: $showAlert) {
                            Alert(title: Text("Alert"), message: Text(alertContent), dismissButton: .default(Text("Ok")))
                        }
                    }

                }.disabled(!tkeyReconstructed)
                    .opacity(!tkeyReconstructed ? 0.5 : 1)
            }
        }
    }
}
