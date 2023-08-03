import SwiftUI
import Web3Auth
import web3

struct UserDetailView: View {
    @State var user: String?
    @Binding var loggedIn: Bool
    @State private var showingAlert = false
    var body: some View {
        if let user = user {
            List {
                Section {
                    Text("\(user)")
                } header: {
                    Text("Private key")
                }
            }
            .listStyle(.automatic)
        }
    }
}

struct UserDetailView_Previews: PreviewProvider {
    static var previews: some View {
        let user: String = "privKey"
        UserDetailView(user: user , loggedIn: .constant(true))
    }
}
