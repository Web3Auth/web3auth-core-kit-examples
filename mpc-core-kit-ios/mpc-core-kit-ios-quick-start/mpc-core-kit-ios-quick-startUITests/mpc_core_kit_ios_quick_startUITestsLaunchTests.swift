//
//  mpc_core_kit_ios_quick_startUITestsLaunchTests.swift
//  mpc-core-kit-ios-quick-startUITests
//
//  Created by Ayush B on 09/04/24.
//

import XCTest

final class mpc_core_kit_ios_quick_startUITestsLaunchTests: XCTestCase {

    override class var runsForEachTargetApplicationUIConfiguration: Bool {
        true
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLaunch() throws {
        let app = XCUIApplication()
        app.launch()

        // Insert steps here to perform after app launch but before taking a screenshot,
        // such as logging into a test account or navigating somewhere in the app

        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "Launch Screen"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
