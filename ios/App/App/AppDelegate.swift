import UIKit
import AVFoundation
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Claim the playback audio category before the web view starts.
        //
        // Everything this app teaches is a sound -- the letter names, the
        // harakat blends, the recitation -- and WKWebView plays HTML audio
        // under the "ambient" category, which the physical ring/silent switch
        // silences. A child handed an iPhone with that switch flipped would
        // work through a whole lesson hearing nothing, with no clue on screen
        // as to why. `.playback` is the category for audio that *is* the
        // content, and it ignores the switch.
        //
        // The session is deliberately not activated here. Activating it at
        // launch would stop whatever the family was already listening to
        // before the child has tapped anything; iOS activates it by itself the
        // first time a clip actually plays.
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback)
        } catch {
            // Not fatal -- lessons still run, they are just silent while the
            // device is muted, which is the behaviour we would have had anyway.
            print("Nakeeyat: could not set the playback audio category: \(error)")
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
