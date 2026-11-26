import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { IconSymbol } from "./icon-symbol";
import { t } from "@/theme";
import { useBreakpoint, type Breakpoint } from "@/hooks/useBreakpoint";
import type { BookCardProgress } from "./BookCard";
import type { CoverShelfBook } from "./CoverShelf";

/* Bookstore-style grid: front cover first, title + author beneath. Reuses the
   CoverShelf tile look but sizes each cover to its grid cell (aspect 2:3).
   The grid is drawn one row at a time so a virtualised list can mount only
   the rows near the screen. */

const COLUMNS: Record<Breakpoint, number> = { mobile: 3, tablet: 4, desktop: 6 };

export function useCoverGridColumns(): number {
  return COLUMNS[useBreakpoint().breakpoint];
}

function GridItem({ item, progress, onPress, onLongPress }: {
  item: CoverShelfBook;
  progress?: BookCardProgress;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const pct = progress?.percentage ?? 0;
  const isFinished = item.status === "finished";

  return (
    <Pressable
      style={({ pressed }) => [gi.cell, pressed && t.press.scale]}
      onPress={onPress} onLongPress={onLongPress} delayLongPress={300}
    >
      <View>
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={gi.cover} contentFit="cover" />
        ) : (
          <View style={[gi.cover, gi.coverEmpty]}>
            <IconSymbol name="book.closed.fill" size={30} color={t.color.text.faint} />
          </View>
        )}

        {pct > 0 && pct < 100 && (
          <View style={gi.progressOverlay}>
            <View style={gi.progressTrack}>
              <View style={[gi.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
            </View>
          </View>
        )}

        {isFinished && (
          <View style={gi.doneBadge}><Text style={gi.doneBadgeText}>✓</Text></View>
        )}
      </View>

      <Text style={gi.title} numberOfLines={2}>{item.title}</Text>
      <Text style={gi.author} numberOfLines={1}>{item.authors ?? "Unknown"}</Text>
    </Pressable>
  );
}

/** One row of the grid. A short last row keeps its cells the full-row width. */
export function CoverGridRow({ books, columns, first, inset, progressMap, onPress, onLongPress }: {
  books: CoverShelfBook[];
  columns: number;
  /** The first row of a grid sits closer to what is above it. */
  first: boolean;
  /** Room on the right for the alphabet index. */
  inset?: boolean;
  progressMap?: Map<number, BookCardProgress>;
  onPress: (id: number) => void;
  onLongPress?: (id: number) => void;
}) {
  return (
    <View style={[gi.row, first && gi.firstRow, inset && gi.inset]}>
      {Array.from({ length: columns }, (_, i) => {
        const item = books[i];
        if (!item) return <View key={`gap-${i}`} style={gi.cell} />;
        return (
          <GridItem key={item.id} item={item} progress={progressMap?.get(item.id)}
            onPress={() => onPress(item.id)}
            onLongPress={onLongPress ? () => onLongPress(item.id) : undefined} />
        );
      })}
    </View>
  );
}

const gi = StyleSheet.create({
  row: { flexDirection: "row", gap: t.space._3, paddingHorizontal: t.space._4, paddingTop: t.space._3 },
  firstRow: { paddingTop: t.space._2 },
  inset: { paddingRight: t.space._4 + 22 },
  cell: { flex: 1, marginBottom: t.space._4 },
  cover: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: t.radius.xl,
    backgroundColor: t.color.glass.bg,
    ...t.shadow.medium,
  },
  coverEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: t.color.glass.border,
  },
  progressOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: t.space._2, paddingBottom: t.space._2,
  },
  progressTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: "rgba(56,73,89,0.28)", overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: t.color.accent.light },
  doneBadge: {
    position: "absolute", top: t.space._2, right: t.space._2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.9)",
    alignItems: "center", justifyContent: "center",
  },
  doneBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  title: { ...t.font.caption, color: t.color.text.primary, marginTop: t.space._2, lineHeight: 16 },
  author: { ...t.font.tiny, color: t.color.text.tertiary, marginTop: 2 },
});
