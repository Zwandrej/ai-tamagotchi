import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  // Kept for React Native. Several RN internals look up
  // UIApplication.shared.delegate.window (RCTLogBoxView, RCTDeviceInfo,
  // RCTProfile). Under the scene lifecycle the window belongs to the scene,
  // so we mirror the reference here and those code paths keep working.
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Deliberately no window here. Apps built with the iOS 26+ SDK must adopt
    // the UIScene lifecycle, and creating a window in didFinishLaunching as
    // well would give us a second, empty window. SceneDelegate does it.
    return true
  }
}

/**
 * UIScene lifecycle entry point.
 *
 * React Native 0.82's template is still window-based, which iOS refuses to
 * launch for apps built with the current SDK:
 *
 *   "Application failed to launch: UIScene life cycle is required for apps
 *    built with this SDK."
 *
 * The scene is declared in Info.plist (UIApplicationSceneManifest), so UIKit
 * instantiates this delegate and we hand its window to React Native. This
 * lives in the same file as AppDelegate on purpose, so no Xcode project
 * changes are required to add it.
 */
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    // Launch options are nil: this app has no URL scheme, no push
    // notifications and no other launch-time payload to forward.
    factory.startReactNative(
      withModuleName: "AITamagotchi",
      in: window,
      launchOptions: nil
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
