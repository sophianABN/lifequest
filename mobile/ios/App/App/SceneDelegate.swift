import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// Le pont Capacitor, avec deux réglages propres à LifeQuest.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        // Fond de marque, clair ou sombre selon le système — le même que
        // l'écran de lancement — plutôt que le blanc par défaut : rien ne
        // clignote entre le lancement et le premier rendu du site.
        let background = UIColor(named: "LaunchBackground") ?? .systemBackground
        webView?.backgroundColor = background
        webView?.scrollView.backgroundColor = background

        // Glisser depuis le bord gauche revient à l'écran précédent, comme
        // partout ailleurs sur iOS. Le routeur de Next.js reçoit un `popstate`
        // ordinaire.
        webView?.allowsBackForwardNavigationGestures = true
    }
}
