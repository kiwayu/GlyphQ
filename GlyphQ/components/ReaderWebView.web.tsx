/*
 * Web stand-in for react-native-webview: a same-origin iframe.
 *
 *   injectJavaScript(js)  ──▶ iframe.contentWindow.eval(js)
 *   ReactNativeWebView.postMessage(d) in the page ──▶ onMessage({nativeEvent:{data:d}})
 *
 * Only the props the reader uses are honoured (source.html, onMessage, style);
 * the native-only ones are accepted and ignored.
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

export interface WebViewMessageEvent {
  nativeEvent: { data: string };
}
export interface ReaderWebViewHandle {
  injectJavaScript: (js: string) => void;
}
interface Props {
  source: { html?: string; uri?: string };
  onMessage?: (e: WebViewMessageEvent) => void;
  style?: StyleProp<ViewStyle>;
}

const BRIDGE =
  "<script>window.ReactNativeWebView={postMessage:function(d){parent.postMessage({__glyphq:1,data:d},'*')}}</script>";

export const ReaderWebView = forwardRef<ReaderWebViewHandle, Props>(
  function ReaderWebView({ source, onMessage, style }, ref) {
    const frame = useRef<HTMLIFrameElement>(null);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    useImperativeHandle(ref, () => ({
      injectJavaScript(js: string) {
        try {
          (frame.current?.contentWindow as (Window & { eval: (s: string) => void }) | null)?.eval(js);
        } catch {
          /* page not ready or script threw: same silence as the native bridge */
        }
      },
    }));

    useEffect(() => {
      const handler = (e: MessageEvent) => {
        if (e.source !== frame.current?.contentWindow || !e.data?.__glyphq) return;
        onMessageRef.current?.({ nativeEvent: { data: e.data.data } });
      };
      window.addEventListener("message", handler);
      return () => window.removeEventListener("message", handler);
    }, []);

    // The bridge must exist before the page's own scripts run.
    const srcDoc = useMemo(
      () => (source.html ?? "").replace("<head>", "<head>" + BRIDGE),
      [source.html]
    );
    const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;

    return (
      <iframe
        ref={frame}
        srcDoc={srcDoc}
        title="Book"
        data-testid="reader-frame"
        style={{ border: 0, width: "100%", height: "100%", ...flat } as React.CSSProperties}
      />
    );
  }
);
