// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: __PACKAGE_NAME__,
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.executable(name: __PACKAGE_NAME__, targets: ["App"])],
    targets: [.executableTarget(name: "App")]
)
