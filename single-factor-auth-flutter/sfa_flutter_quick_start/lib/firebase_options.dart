// File generated by FlutterFire CLI.
// ignore_for_file: lines_longer_than_80_chars, avoid_classes_with_only_static_members
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
///
/// Example:
/// ```dart
/// import 'firebase_options.dart';
/// // ...
/// await Firebase.initializeApp(
///   options: DefaultFirebaseOptions.currentPlatform,
/// );
/// ```
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyB0nd9YsPLu-tpdCrsXn8wgsWVAiYEpQ_E',
    appId: '1:461819774167:web:6c41f415deaf88975b9c92',
    messagingSenderId: '461819774167',
    projectId: 'web3auth-oauth-logins',
    authDomain: 'web3auth-oauth-logins.firebaseapp.com',
    databaseURL:
        'https://web3auth-oauth-logins-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'web3auth-oauth-logins.appspot.com',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCL2uSXiGvQcfZ00IJ1g2uwC-7IcGZGVfQ',
    appId: '1:461819774167:android:3965e33a39b19ccc5b9c92',
    messagingSenderId: '461819774167',
    projectId: 'web3auth-oauth-logins',
    databaseURL:
        'https://web3auth-oauth-logins-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'web3auth-oauth-logins.appspot.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAttkINEO4AWRc2jJDHa5fPYp_1EtujcH0',
    appId: '1:461819774167:ios:6caadb0d1679813f5b9c92',
    messagingSenderId: '461819774167',
    projectId: 'web3auth-oauth-logins',
    databaseURL:
        'https://web3auth-oauth-logins-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'web3auth-oauth-logins.appspot.com',
    androidClientId:
        '461819774167-93iair46nluf28pdbpmqq65eqktdbb7g.apps.googleusercontent.com',
    iosClientId:
        '461819774167-2pvcbhf57nqu3u45gakhaff781re18rd.apps.googleusercontent.com',
    iosBundleId: 'com.example.sfaFlutterQuickStart',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyAttkINEO4AWRc2jJDHa5fPYp_1EtujcH0',
    appId: '1:461819774167:ios:51e6e46505a519335b9c92',
    messagingSenderId: '461819774167',
    projectId: 'web3auth-oauth-logins',
    databaseURL:
        'https://web3auth-oauth-logins-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'web3auth-oauth-logins.appspot.com',
    androidClientId:
        '461819774167-93iair46nluf28pdbpmqq65eqktdbb7g.apps.googleusercontent.com',
    iosClientId:
        '461819774167-a8ni5tvonki0pnv00q7gvmupn20fhm8g.apps.googleusercontent.com',
    iosBundleId: 'com.example.sfaFlutterQuickStart.RunnerTests',
  );
}