#!/usr/bin/env bash
set -euo pipefail

cd "$SWIFT_DIRECTORY"

case "$1" in
  checks)
    swift build
    ;;
  tests)
    swift package describe --type json > /tmp/swift-package.json
    if python3 -c 'import json; import sys; sys.exit(not any(t["type"] == "test" for t in json.load(open("/tmp/swift-package.json"))["targets"]))'; then
      swift test
    else
      echo "No Swift package tests configured."
    fi
    if python3 -c 'import xml.etree.ElementTree as ET; import sys; root = ET.parse("App.xcodeproj/xcshareddata/xcschemes/App.xcscheme"); sys.exit(not (root.findall(".//TestableReference") or root.findall(".//TestPlanReference")))'; then
      destination=$(python3 -c 'import json, subprocess; data = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "--json"])); print(next(d["udid"] for runtime, devices in sorted(data["devices"].items(), reverse=True) if "iOS" in runtime for d in devices if "iPhone" in d["name"]))')
      xcodebuild test -project App.xcodeproj -scheme App -destination "platform=iOS Simulator,id=$destination" -derivedDataPath DerivedData/ci -clonedSourcePackagesDirPath .build/SourcePackages CODE_SIGNING_ALLOWED=NO
    else
      echo "No Xcode tests configured."
    fi
    ;;
  build)
    xcodebuild build -project App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS Simulator' -derivedDataPath DerivedData/ci -clonedSourcePackagesDirPath .build/SourcePackages CODE_SIGNING_ALLOWED=NO
    ;;
  *)
    echo "Unknown Swift task: $1" >&2
    exit 1
    ;;
esac
