import 'package:flutter/widgets.dart';

class AppState extends InheritedWidget {
  const AppState({
    super.key,
    required super.child,
  });

  final bool _isConnected = false;

  bool get isConnected => _isConnected;
  set isConnected(bool value) => _isConnected = value;  

  static AppState? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AppState>();
  }

  static AppState of(BuildContext context) {
    final AppState? result = maybeOf(context);
    assert(result != null, 'No AppState found in context');
    return result!;
  }

  @override
  bool updateShouldNotify(AppState oldWidget) =>
      _isConnected != oldWidget._isConnected;
}
