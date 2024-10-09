extension StringExtension on String {
  String get addressAbbreviation =>
      "${substring(0, 4)}...${substring(length - 4, length)}";
}