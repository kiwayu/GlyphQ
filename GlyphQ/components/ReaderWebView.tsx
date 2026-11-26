/*
 * The reader's WebView. Native uses react-native-webview as-is; the web build
 * (ReaderWebView.web.tsx) swaps in an iframe, because react-native-webview has
 * no web implementation.
 */
export { WebView as ReaderWebView } from "react-native-webview";
export type { WebView as ReaderWebViewHandle, WebViewMessageEvent } from "react-native-webview";
