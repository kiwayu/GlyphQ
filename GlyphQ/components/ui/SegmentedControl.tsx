import { useRef, useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { t } from "@/theme";

export interface Segment {
  key: string;
  label: string;
  count?: number;
}

interface SegmentedControlProps {
  segments: Segment[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function SegmentedControl({ segments, activeKey, onChange }: SegmentedControlProps) {
  const scrollRef = useRef<ScrollView>(null);
  /* The pill that becomes active dips and springs back. Reanimated runs it on
     the UI thread and skips it when the system asks for reduced motion. */
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(
      withTiming(t.anim.microBounce.toValue, { duration: t.anim.microBounce.duration }),
      withSpring(1, { damping: 14, stiffness: 220 })
    );
  }, [activeKey, scale]);
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={sc.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sc.scroll}
      >
        {segments.map((seg, i) => {
          const active = seg.key === activeKey;
          return (
            <Animated.View
              key={seg.key}
              style={active ? bounce : undefined}
            >
              <Pressable
                style={[sc.pill, active && sc.pillActive]}
                onPress={() => {
                  onChange(seg.key);
                  if (scrollRef.current && i > 1) {
                    scrollRef.current.scrollTo({ x: Math.max(0, i * 90 - 40), animated: true });
                  }
                }}
              >
                <Text style={[sc.pillLabel, active && sc.pillLabelActive]}>
                  {seg.label}
                </Text>
                {seg.count != null && seg.count > 0 && (
                  <View style={[sc.badge, active && sc.badgeActive]}>
                    <Text style={[sc.badgeText, active && sc.badgeTextActive]}>
                      {seg.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const sc = StyleSheet.create({
  container: {
    marginTop: t.space._3,
    paddingBottom: t.space._2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border.subtle,
  },
  scroll: {
    paddingHorizontal: t.space._4,
    paddingBottom: t.space._1,
    gap: t.space._2 - 2,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space._4 - 2,
    paddingVertical: t.space._2,
    borderRadius: t.radius.lg,
    backgroundColor: t.color.glass.bg,
    borderWidth: 1,
    borderColor: t.color.glass.border,
  },
  pillActive: {
    backgroundColor: t.color.accent.bg,
    borderColor: t.color.accent.border,
  },

  pillLabel: {
    color: t.color.text.tertiary,
    fontSize: 13,
    fontWeight: "600",
  },
  pillLabelActive: {
    color: t.color.accent.lightest,
  },

  badge: {
    marginLeft: t.space._2 - 2,
    backgroundColor: t.color.glass.bgHover,
    borderRadius: t.radius.md,
    minWidth: 20,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeActive: {
    backgroundColor: t.color.accent.bgStrong,
  },
  badgeText: {
    color: t.color.text.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  badgeTextActive: {
    color: t.color.accent.lighter,
  },
});
