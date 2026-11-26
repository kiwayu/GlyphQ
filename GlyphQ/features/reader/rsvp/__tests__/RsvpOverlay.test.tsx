/*
 * Integration test for the RSVP overlay: mounts the real component and
 * drives it through a play loop with a controlled clock + rAF, proving the
 * engine → state → rendered-word wiring works end to end (the device-level
 * Maestro journey for this is deferred — see TODOS.md #4).
 */
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { getAnimatedStyle } from "react-native-reanimated";
import RsvpOverlay from "../RsvpOverlay";
import { tokenizeParagraphs } from "../engine";

const colors = {
  bg: "#fff",
  fg: "#000",
  sub: "#888",
  accent: "#3f82bc",
  barBg: "#eee",
  border: "#ddd",
};

// "alpha beta gamma delta" at 300 WPM averages 200ms a word: 800ms in all.
// "delta" is the paragraph end and holds 2.8x as long as a plain word, so a
// plain word lasts 800 / 5.8 ≈ 138ms. cumEnd ≈ [138, 276, 414, 800].
const tokens = tokenizeParagraphs(["alpha beta gamma delta"]);

let clock = 0;
let rafCbs: FrameRequestCallback[] = [];

beforeEach(() => {
  clock = 0;
  rafCbs = [];
  // Reanimated hands work to its UI runtime with setTimeout(0) under jest.
  // Faking only the timer queue lets each frame below run it in step with the
  // clock, while Date, performance and rAF stay under this file's control.
  jest.useFakeTimers({
    doNotFake: [
      "Date",
      "performance",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "nextTick",
      "queueMicrotask",
    ],
  });
  jest.spyOn(Date, "now").mockImplementation(() => clock);
  // Reanimated stamps animation starts with performance.now().
  jest.spyOn(performance, "now").mockImplementation(() => clock);
  global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    rafCbs.push(cb);
    return rafCbs.length;
  }) as typeof requestAnimationFrame;
  global.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function flushFrame() {
  const cbs = rafCbs;
  rafCbs = [];
  act(() => {
    jest.runOnlyPendingTimers();
    cbs.forEach((cb) => cb(clock));
    jest.runOnlyPendingTimers();
  });
}

/** Run the frame loop for `ms`, one 16ms frame at a time. */
function advance(ms: number) {
  const end = clock + ms;
  while (clock < end) {
    clock = Math.min(end, clock + 16);
    flushFrame();
  }
}

/** Opacity the reader sees on a view, as Reanimated last set it. */
function opacity(r: ReactTestRenderer, testID: string): number {
  const host = r.root.find(
    (n) => n.props.testID === testID && typeof n.type === "string"
  );
  const o = getAnimatedStyle(host).opacity;
  return typeof o === "number" ? o : 1;
}

function word(r: ReactTestRenderer): string {
  return r.root.findByProps({ testID: "rsvp-word" }).props.accessibilityLabel;
}

function press(r: ReactTestRenderer, testID: string) {
  act(() => {
    r.root.findByProps({ testID }).props.onPress();
  });
}

describe("RsvpOverlay", () => {
  it("shows the first word, paused, on mount", () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          colors={colors}
          onClose={() => {}}
        />
      );
    });
    expect(word(r)).toBe("alpha");
  });

  it("advances through words as the clock runs while playing", () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          colors={colors}
          onClose={() => {}}
        />
      );
    });

    press(r, "rsvp-playpause"); // start playing from index 0
    expect(word(r)).toBe("alpha");

    clock = 140; // past word 0's 138ms end
    flushFrame();
    expect(word(r)).toBe("beta");

    clock = 280; // past word 1
    flushFrame();
    expect(word(r)).toBe("gamma");

    clock = 420; // past word 2
    flushFrame();
    expect(word(r)).toBe("delta");
  });

  it("resumes from a saved word index", () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          startIndex={2}
          colors={colors}
          onClose={() => {}}
        />
      );
    });
    expect(word(r)).toBe("gamma");
  });

  it("reports the last index reached when closed", () => {
    const onClose = jest.fn();
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          colors={colors}
          onClose={onClose}
        />
      );
    });

    press(r, "rsvp-playpause");
    clock = 300;
    flushFrame(); // now on "gamma" (index 2)
    press(r, "rsvp-close");

    expect(onClose).toHaveBeenCalledWith(2);
  });

  it("tells the parent once when the chapter finishes, and mounts the next one paused", () => {
    const onFinish = jest.fn();
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          colors={colors}
          onFinish={onFinish}
          onClose={() => {}}
        />
      );
    });

    press(r, "rsvp-playpause");
    clock = 810; // past "delta"'s paragraph-end pause (cumEnd = 800)
    flushFrame();
    expect(onFinish).toHaveBeenCalledTimes(1);

    // The parent answers by remounting with the next chapter's tokens — a fresh
    // mount is the "paused at the first word" state the user asked for.
    const next = tokenizeParagraphs(["epsilon zeta"]);
    let r2!: ReactTestRenderer;
    act(() => {
      r2 = create(
        <RsvpOverlay
          tokens={next}
          initialWpm={300}
          colors={colors}
          onFinish={onFinish}
          onClose={() => {}}
        />
      );
    });
    expect(word(r2)).toBe("epsilon");
    clock = 5000;
    flushFrame(); // no rAF scheduled while paused → still the first word
    expect(word(r2)).toBe("epsilon");
  });

  /* ── chapter transition ─────────────────────────────
     The label is held in the word slot rather than on a card: RSVP's premise
     is that the eye never moves, so a new surface at the chapter boundary
     would break the one thing the feature is for. */

  function slot(r: ReactTestRenderer): string {
    return r.root.findByProps({ testID: "rsvp-slot" }).props.children;
  }

  it("holds the chapter label in the word slot, then resumes on its own", () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          introLabel="Chapter 2 — The Return"
          colors={colors}
          onClose={() => {}}
        />
      );
    });

    // The label occupies the word slot; no focus word is rendered yet.
    expect(slot(r)).toBe("Chapter 2 — The Return");
    expect(() => r.root.findByProps({ testID: "rsvp-focus" })).toThrow();

    // 6 word slots at 300 WPM = 1200ms.
    clock = 1300;
    flushFrame();

    expect(word(r)).toBe("alpha"); // resumed at the first word
    expect(() => r.root.findByProps({ testID: "rsvp-slot" })).toThrow();
  });

  it("stays put when tapped during the intro instead of resuming", () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          introLabel="Chapter 2"
          colors={colors}
          onClose={() => {}}
        />
      );
    });

    press(r, "rsvp-stage"); // "Tap to stay here"

    clock = 5000;
    flushFrame(); // the hold would long since have elapsed

    // Paused on the first word, not playing.
    expect(word(r)).toBe("alpha");
    clock = 9000;
    flushFrame();
    expect(word(r)).toBe("alpha");
  });

  it("says it is fetching the next chapter rather than claiming to be finished", () => {
    // The old behaviour showed "Finished — tap restart" during the async spine
    // walk, and the restart button replayed the chapter just completed.
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          advancing
          colors={colors}
          onClose={() => {}}
        />
      );
    });

    expect(slot(r)).toBe("Next chapter…");
    expect(r.root.findByProps({ testID: "rsvp-playpause" }).props.disabled).toBe(
      true
    );
  });

  it("marks the end of a book in the word slot, with a way back", () => {
    const onBackToChapter = jest.fn();
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          endOfBook
          bookTitle="Dune"
          onBackToChapter={onBackToChapter}
          colors={colors}
          onClose={() => {}}
        />
      );
    });

    expect(slot(r)).toBe("You finished Dune");
    press(r, "rsvp-back-chapter");
    expect(onBackToChapter).toHaveBeenCalled();
  });

  /* ── sentence stepping ─────────────────────────────── */

  // [One two.] [Three four five.] [Six seven] (paragraph end) [Eight nine.]
  const prose = tokenizeParagraphs(["One two. Three four five. Six seven", "Eight nine."]);
  const at = (w: string) => prose.findIndex((t) => t.word === w);

  function pressLabel(r: ReactTestRenderer, label: string) {
    act(() => {
      r.root.findByProps({ accessibilityLabel: label }).props.onPress();
    });
  }

  function mountProse(startIndex: number) {
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={prose}
          initialWpm={300}
          startIndex={startIndex}
          colors={colors}
          onClose={() => {}}
        />
      );
    });
    return r;
  }

  it("« restarts the current sentence, then steps back a sentence at a time", () => {
    const r = mountProse(at("four"));
    pressLabel(r, "Previous sentence");
    expect(word(r)).toBe("Three");
    pressLabel(r, "Previous sentence");
    expect(word(r)).toBe("One");
    pressLabel(r, "Previous sentence");
    expect(word(r)).toBe("One");
  });

  it("» jumps to the next sentence, across a paragraph end, and stops at the last word", () => {
    const r = mountProse(at("One"));
    pressLabel(r, "Next sentence");
    expect(word(r)).toBe("Three");
    pressLabel(r, "Next sentence");
    expect(word(r)).toBe("Six");
    pressLabel(r, "Next sentence");
    expect(word(r)).toBe("Eight");
    pressLabel(r, "Next sentence");
    expect(word(r)).toBe("nine.");
  });

  it("keeps playing from the sentence start after «", () => {
    const r = mountProse(at("Three"));
    press(r, "rsvp-playpause");
    // 9 words averaging 200ms = 1800ms; their multipliers sum to 15, so a
    // plain word lasts 120ms: Three [0,120) four [120,240) five. [240,504).
    clock = 300;
    flushFrame();
    expect(word(r)).toBe("five.");

    pressLabel(r, "Previous sentence");
    expect(word(r)).toBe("Three");
    clock = 410; // 110ms after the press
    flushFrame();
    expect(word(r)).toBe("Three"); // the clock restarted at the sentence start
    clock = 430; // 130ms after
    flushFrame();
    expect(word(r)).toBe("four"); // and playback carried on from there
  });

  /* ── sentence on pause ─────────────────────────────── */

  function textOf(node: { children: unknown[] }): string {
    return node.children
      .map((c) => (typeof c === "string" ? c : textOf(c as { children: unknown[] })))
      .join("");
  }

  function sentenceBox(r: ReactTestRenderer) {
    return r.root.find(
      (n) => n.props.testID === "rsvp-sentence" && typeof n.type === "string"
    );
  }

  /** The sentence as shown, and which part of it is in the main colour. */
  function sentence(r: ReactTestRenderer) {
    const box = sentenceBox(r);
    const highlighted = box
      .findAll(
        (n) =>
          typeof n.type === "string" &&
          StyleSheet.flatten(n.props.style)?.color === colors.fg
      )
      .map(textOf);
    return { text: textOf(box), highlighted };
  }

  it("shows the current sentence under the word while paused", () => {
    const r = mountProse(at("four"));
    expect(sentence(r)).toEqual({
      text: "Three four five.",
      highlighted: ["four"],
    });
    expect(opacity(r, "rsvp-sentence")).toBe(1);
  });

  it("fades the sentence out while playing and back in, on the new word, when paused", () => {
    const r = mountProse(at("Three"));
    press(r, "rsvp-playpause");
    advance(70); // mid-fade
    expect(opacity(r, "rsvp-sentence")).toBeGreaterThan(0);
    expect(opacity(r, "rsvp-sentence")).toBeLessThan(1);
    advance(100); // 170ms in: faded out, now on "four" (plain words last 120ms)
    expect(opacity(r, "rsvp-sentence")).toBe(0);
    expect(word(r)).toBe("four");

    press(r, "rsvp-playpause"); // pause on "four"
    expect(sentence(r).highlighted).toEqual(["four"]);
    advance(160);
    expect(opacity(r, "rsvp-sentence")).toBe(1);
  });

  it("keeps the sentence's space while hidden, so the focus word never moves", () => {
    const r = mountProse(at("Three"));
    const layout = () => {
      const { opacity: _o, ...rest } = StyleSheet.flatten(sentenceBox(r).props.style);
      return rest;
    };
    const paused = layout();
    expect(paused.height).toBeGreaterThan(0);
    press(r, "rsvp-playpause");
    advance(200);
    expect(opacity(r, "rsvp-sentence")).toBe(0);
    expect(layout()).toEqual(paused);
  });

  it("joins em-dash halves back into one word", () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokenizeParagraphs(["It was war—peace again."])}
          initialWpm={300}
          startIndex={3}
          colors={colors}
          onClose={() => {}}
        />
      );
    });
    expect(sentence(r)).toEqual({
      text: "It was war—peace again.",
      highlighted: ["peace"],
    });
  });

  it("cuts a long sentence to a window that keeps the current word in view", () => {
    const words = Array.from({ length: 60 }, (_, i) => `w${i}`);
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokenizeParagraphs([words.join(" ") + "."])}
          initialWpm={300}
          startIndex={40}
          colors={colors}
          onClose={() => {}}
        />
      );
    });
    const { text, highlighted } = sentence(r);
    expect(highlighted).toEqual(["w40"]);
    // Eight words of lead-in keep the current word on the box's first lines,
    // where the line limit cannot clip it, with ellipses where it is cut.
    expect(text.startsWith("… w32 w33 w34 w35 w36 w37 w38 w39 w40 ")).toBe(true);
    expect(text.endsWith(" …")).toBe(true);
  });

  it("shows and hides the sentence at once when reduce motion is on", async () => {
    // React Native's jest setup already mocks this; spyOn would hand back that
    // shared mock and leak the value into later tests. Once is one mount.
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValueOnce(true);
    const r = mountProse(at("Three"));
    await act(async () => {}); // let the setting load

    press(r, "rsvp-playpause");
    flushFrame(); // one frame, no time passing
    expect(opacity(r, "rsvp-sentence")).toBe(0);

    press(r, "rsvp-playpause");
    flushFrame();
    expect(opacity(r, "rsvp-sentence")).toBe(1);
  });

  it("emits WPM changes to the parent", () => {
    const onWpmChange = jest.fn();
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={tokens}
          initialWpm={300}
          colors={colors}
          onWpmChange={onWpmChange}
          onClose={() => {}}
        />
      );
    });

    // Press the "+" stepper: 300 -> 325.
    press(r, "rsvp-wpm-inc");
    expect(onWpmChange).toHaveBeenCalledWith(325);
  });

  it("auto-shrinks the focus word so it is never truncated or ellipsised", () => {
    const longTokens = tokenizeParagraphs([
      "supercalifragilisticexpialidocious",
    ]);
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={longTokens}
          initialWpm={300}
          colors={colors}
          onClose={() => {}}
        />
      );
    });
    const focus = r.root.findByProps({ testID: "rsvp-focus" });
    // scale-to-fit + single line == shrinks instead of clipping/ellipsising
    expect(focus.props.adjustsFontSizeToFit).toBe(true);
    expect(focus.props.numberOfLines).toBe(1);
  });

  it("handles an empty chapter without crashing", () => {
    const onClose = jest.fn();
    let r!: ReactTestRenderer;
    act(() => {
      r = create(
        <RsvpOverlay
          tokens={[]}
          initialWpm={300}
          colors={colors}
          onClose={onClose}
        />
      );
    });
    // Empty-state renders its own close affordance; pressing it reports -? safely.
    expect(() => word(r)).toThrow(); // no word node in empty state
  });
});
