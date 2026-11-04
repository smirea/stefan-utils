// swift-tools-version: 6.4
import PackageDescription

let package = Package(
    name: __PACKAGE_NAME__,
    platforms: [.iOS(.v27), .macOS(.v27)],
    products: [.executable(name: __PACKAGE_NAME__, targets: ["App"])],
    targets: [.executableTarget(name: "App")]
)
