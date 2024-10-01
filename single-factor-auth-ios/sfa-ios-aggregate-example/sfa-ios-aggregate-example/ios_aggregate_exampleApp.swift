//
//  ios_aggregate_exampleApp.swift
//  ios-aggregate-example
//
//  Created by Ayush B on 24/09/24.
//

import SwiftUI

@main
struct ios_aggregate_exampleApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView(viewModel: MainViewModel())
        }
    }
}
