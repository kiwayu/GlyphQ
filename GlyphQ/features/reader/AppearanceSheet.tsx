/*
 * The reader's one appearance sheet: theme, font, size, spacing, margins.
 * It covers the bottom of the page only, so every change previews on the book
 * above it. Motion is Reanimated layout animation (UI thread, transform and
 * opacity only) and is skipped when the system asks for reduced motion.
 */
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { Easing, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { READER_THEMES, READER_THEME_ORDER, type ReaderTheme } from "./readerThemes";
import type { ReaderFont, ReaderSettings } from "./readerHtml";
import { t } from "@/theme";

export const FONT_SIZES = [13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26];
export const LINE_HEIGHTS = [1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];
export const MARGINS = [8, 12, 16, 20, 24, 28, 32, 40, 48];

const FONTS: { id: ReaderFont; label: string }[] = [
  { id: "georgia", label: "Georgia" },
  { id: "palatino", label: "Palatino" },
  { id: "charter", label: "Charter" },
  { id: "system", label: "System" },
];

/* Material 3 bottom-sheet spring: damping ratio 0.9 at stiffness 700. */
export const SHEET_IN = SlideInDown.springify().stiffness(700).damping(48);
export const SHEET_OUT = SlideOutDown.duration(200).easing(Easing.bezier(0.3, 0, 1, 1));

/** Index of the option closest to `value`, so an off-list saved value still steps. */
function nearest(options: number[], value: number): number {
  let best = 0;
  for (let i = 1; i < options.length; i++) {
    if (Math.abs(options[i] - value) < Math.abs(options[best] - value)) best = i;
  }
  return best;
}

interface Props {
  settings: ReaderSettings;
  /** Colours of the app theme, offered as the first swatch. */
  appPalette: { bg: string; fg: string; link: string };
  onChange: (patch: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

export default function AppearanceSheet({ settings, appPalette, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const followsApp = !!settings.bg;

  return (
    <>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Close appearance"
      />
      <Animated.View
        entering={SHEET_IN}
        exiting={SHEET_OUT}
        style={[st.sheet, { paddingBottom: insets.bottom + t.space._4 }]}
        testID="appearance-sheet"
      >
        <View style={st.handle} />

        <View style={st.swatchRow}>
          <Pressable
            style={[st.swatch, { backgroundColor: appPalette.bg }, followsApp && st.swatchActive]}
            onPress={() => onChange({ ...appPalette })}
            accessibilityRole="button"
            accessibilityState={{ selected: followsApp }}
            accessibilityLabel="App theme"
          >
            <Text style={[st.swatchLabel, { color: appPalette.fg }]}>App</Text>
          </Pressable>
          {READER_THEME_ORDER.map((id: ReaderTheme) => {
            const active = !followsApp && settings.theme === id;
            const th = READER_THEMES[id];
            return (
              <Pressable
                key={id}
                style={[st.swatch, { backgroundColor: th.bg }, active && st.swatchActive]}
                onPress={() => onChange({ theme: id, bg: null, fg: null, link: null })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${th.label} theme`}
              >
                <Text style={[st.swatchLabel, { color: th.fg }]}>{th.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={st.fontRow}>
          {FONTS.map((f) => {
            const active = settings.font === f.id;
            return (
              <Pressable
                key={f.id}
                style={[st.pill, active && st.pillActive]}
                onPress={() => onChange({ font: f.id })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[st.pillText, active && st.pillTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Stepper
          label="Text size"
          value={`${settings.fontSize}`}
          options={FONT_SIZES}
          current={settings.fontSize}
          onPick={(v) => onChange({ fontSize: v })}
          less="A−"
          more="A+"
          testID="font-size"
        />
        <Stepper
          label="Line spacing"
          value={settings.lineHeight.toFixed(1)}
          options={LINE_HEIGHTS}
          current={settings.lineHeight}
          onPick={(v) => onChange({ lineHeight: v })}
        />
        <Stepper
          label="Margins"
          value={`${settings.marginWidth}`}
          options={MARGINS}
          current={settings.marginWidth}
          onPick={(v) => onChange({ marginWidth: v })}
          last
        />
      </Animated.View>
    </>
  );
}

function Stepper({
  label, value, options, current, onPick, less = "−", more = "+", last, testID,
}: {
  label: string;
  value: string;
  options: number[];
  current: number;
  onPick: (v: number) => void;
  less?: string;
  more?: string;
  last?: boolean;
  testID?: string;
}) {
  const i = nearest(options, current);
  const canLess = i > 0;
  const canMore = i < options.length - 1;
  return (
    <View style={[st.row, last && st.rowLast]}>
      <Text style={st.rowLabel}>{label}</Text>
      <View style={st.rowControl}>
        <Pressable
          onPress={() => onPick(options[i - 1])}
          disabled={!canLess}
          style={[st.step, !canLess && st.stepDisabled]}
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          testID={testID && `${testID}-dec`}
        >
          <Text style={st.stepText}>{less}</Text>
        </Pressable>
        <Text style={st.rowValue} testID={testID && `${testID}-value`}>{value}</Text>
        <Pressable
          onPress={() => onPick(options[i + 1])}
          disabled={!canMore}
          style={[st.step, !canMore && st.stepDisabled]}
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          testID={testID && `${testID}-inc`}
        >
          <Text style={st.stepText}>{more}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: t.space._5,
    backgroundColor: t.color.bg.base,
    borderTopLeftRadius: t.radius["4xl"],
    borderTopRightRadius: t.radius["4xl"],
    ...t.shadow.heavy,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.color.border.default,
    alignSelf: "center",
    marginTop: t.space._3,
    marginBottom: t.space._4,
  },
  swatchRow: { flexDirection: "row", gap: t.space._2 },
  swatch: {
    flex: 1,
    height: 56,
    borderRadius: t.radius.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: t.color.border.default,
  },
  swatchActive: { borderColor: t.color.accent.base, borderWidth: 2.5 },
  swatchLabel: { fontSize: 12, fontWeight: "700" },
  fontRow: { flexDirection: "row", gap: t.space._2, marginTop: t.space._3 },
  pill: {
    flex: 1,
    paddingVertical: t.space._2,
    borderRadius: t.radius.xl,
    alignItems: "center",
    backgroundColor: t.color.bg.raised,
    borderWidth: 1,
    borderColor: t.color.border.default,
  },
  pillActive: {
    backgroundColor: t.color.accent.bgStrong,
    borderColor: t.color.accent.border,
  },
  pillText: { fontSize: 12, fontWeight: "600", color: t.color.text.secondary },
  pillTextActive: { color: t.color.accent.strong, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: t.space._3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border.subtle,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { ...t.font.body, flex: 1 },
  rowControl: { flexDirection: "row", alignItems: "center", gap: t.space._3 },
  rowValue: {
    ...t.font.body,
    color: t.color.text.tertiary,
    minWidth: 40,
    textAlign: "center",
  },
  step: {
    width: 44,
    height: 36,
    borderRadius: t.radius.xl,
    backgroundColor: t.color.bg.raised,
    borderWidth: 1,
    borderColor: t.color.border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDisabled: { opacity: 0.35 },
  stepText: { fontSize: 16, fontWeight: "600", color: t.color.text.primary },
});
