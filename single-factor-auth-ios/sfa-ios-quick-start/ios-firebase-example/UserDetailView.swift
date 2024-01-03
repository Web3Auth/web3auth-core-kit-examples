import SwiftUI
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
                Section {
                    Button {
                        Task.detached {
                            await MainActor.run(body: {
                                loggedIn.toggle()
                            })
                        }
                    } label: {
                        Label("Logout", systemImage: "arrow.left.square.fill")
                            .foregroundColor(.red)
                    }
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
