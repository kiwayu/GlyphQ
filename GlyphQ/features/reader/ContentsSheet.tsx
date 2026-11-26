/*
 * Contents and bookmarks in one sheet, with two tabs. Bookmarks used to be
 * write-only: the reader could add one and never see the list.
 */
import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SHEET_IN, SHEET_OUT } from "./AppearanceSheet";
import type { Bookmark } from "@/services/bookmarks";
import { t } from "@/theme";

export interface TocItem {
  id: string;
  label: string;
  href: string;
  level: number;
}

interface Props {
  toc: TocItem[];
  bookmarks: Bookmark[];
  /** Label of the chapter on screen, marked in the list. */
  currentChapter: string;
  onGoToChapter: (href: string) => void;
  onGoToBookmark: (cfi: string) => void;
  onDeleteBookmark: (id: number) => void;
  onClose: () => void;
}

export default function ContentsSheet({
  toc, bookmarks, currentChapter, onGoToChapter, onGoToBookmark, onDeleteBookmark, onClose,
}: Props) {
  const [tab, setTab] = useState<"contents" | "bookmarks">("contents");

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(100)}
        style={[StyleSheet.absoluteFill, st.scrim]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close contents" />
      </Animated.View>
      <SafeAreaView style={st.container} pointerEvents="box-none">
        <Animated.View entering={SHEET_IN} exiting={SHEET_OUT} style={st.sheet} testID="contents-sheet">
          <View style={st.header}>
            <View style={st.tabs}>
              {(["contents", "bookmarks"] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setTab(k)}
                  style={[st.tab, tab === k && st.tabActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === k }}
                >
                  <Text style={[st.tabText, tab === k && st.tabTextActive]}>
                    {k === "contents" ? "Contents" : `Bookmarks${bookmarks.length ? ` · ${bookmarks.length}` : ""}`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={onClose} style={st.close} accessibilityLabel="Close" hitSlop={8}>
              <Text style={st.closeText}>✕</Text>
            </Pressable>
          </View>

          {tab === "contents" ? (
            toc.length === 0 ? (
              <Empty text="This book has no table of contents" />
            ) : (
              <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
                {toc.map((item) => {
                  const current = !!currentChapter && item.label === currentChapter;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => onGoToChapter(item.href)}
                      style={({ pressed }) => [
                        st.item,
                        { paddingLeft: t.space._5 + item.level * t.space._4 },
                        pressed && st.itemPressed,
                      ]}
                    >
                      <Text
                        style={[st.itemText, item.level > 0 && st.itemNested, current && st.itemCurrent]}
                        numberOfLines={2}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )
          ) : bookmarks.length === 0 ? (
            <Empty text="No bookmarks yet. Tap the bookmark at the top of a page to add one." />
          ) : (
            <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
              {bookmarks.map((bm) => (
                <View key={bm.id} style={st.item}>
                  <Pressable style={st.bookmarkMain} onPress={() => onGoToBookmark(bm.cfi)}>
                    <Text style={st.itemText} numberOfLines={1}>
                      {bm.label || (bm.page_number ? `Page ${bm.page_number}` : "Bookmark")}
                    </Text>
                    <Text style={st.itemMeta}>
                      {bm.label && bm.page_number ? `Page ${bm.page_number} · ` : ""}
                      {new Date(bm.created_at).toLocaleDateString()}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDeleteBookmark(bm.id)}
                    hitSlop={10}
                    accessibilityLabel="Remove bookmark"
                  >
                    <Text style={st.remove}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={st.empty}>
      <Text style={st.emptyText}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  scrim: { backgroundColor: "rgba(0,0,0,0.38)" },
  container: { flex: 1, marginHorizontal: t.space._3, marginTop: t.space._10 },
  sheet: {
    flex: 1,
    backgroundColor: t.color.bg.base,
    borderTopLeftRadius: t.radius["4xl"],
    borderTopRightRadius: t.radius["4xl"],
    overflow: "hidden",
    ...t.shadow.heavy,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space._4,
    paddingVertical: t.space._3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border.default,
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: t.color.bg.raised,
    borderRadius: t.radius.xl,
    padding: 3,
    marginRight: t.space._3,
  },
  tab: { flex: 1, paddingVertical: t.space._2, borderRadius: t.radius.lg, alignItems: "center" },
  tabActive: { backgroundColor: t.color.bg.base },
  tabText: { fontSize: 13, fontWeight: "600", color: t.color.text.tertiary },
  tabTextActive: { color: t.color.text.primary },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.color.bg.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: t.color.text.secondary, fontSize: 13, fontWeight: "700" },
  scroll: { flex: 1 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space._5,
    paddingVertical: t.space._4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border.subtle,
  },
  itemPressed: { backgroundColor: t.color.bg.raised },
  itemText: { flex: 1, ...t.font.body, lineHeight: 20 },
  itemNested: { color: t.color.text.tertiary, fontSize: 14 },
  itemCurrent: { color: t.color.accent.base, fontWeight: "700" },
  itemMeta: { ...t.font.caption, color: t.color.text.tertiary, marginTop: 2 },
  bookmarkMain: { flex: 1 },
  remove: { ...t.font.caption, color: t.color.text.tertiary, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: t.space._8 },
  emptyText: { ...t.font.body, color: t.color.text.tertiary, textAlign: "center", lineHeight: 22 },
});
