import SwiftUI

@main
struct tkey_iosApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView(vm: LoginModel())
        }
    }
}
