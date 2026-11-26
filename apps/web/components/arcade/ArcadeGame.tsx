"use client";

import { ARCADE_LIVES, ARCADE_SECONDS, type ArcadeAction, type ArcadeQuestion, type ArcadeState, arcadeStart, arcadeStep, arcadeXp } from "@ise/game-engine";
import type { ArcadeGame as ArcadeGameId } from "@ise/progress-store";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ARCADE_GAMES, deckFor } from "@/lib/arcade";
import { useCues } from "@/lib/cues";
import { useProgress, useProgressStore } from "@/lib/progress";
import { BoltIcon, CloseIcon, HeartIcon, TargetIcon } from "../icons";
import { Pictogram } from "../play/Pictogram";
import { Button } from "../ui/Button";

/** How long the answer stays on screen before the next question: short when right, longer to read the right answer when not. */
const REVEAL_MS = { right: 280, wrong: 900 } as const;

interface Reveal {
  question: ArcadeQuestion;
  chosen: string;
  right: boolean;
}

/**
 * One arcade game, start to finish: the rules and your best, then a 60-second
 * round of one-tap questions, then the score. Any deck plays the same way;
 * `seed` fixes the deck (tests), otherwise every round is dealt afresh.
 */
export function ArcadeGame({ game, seed }: { game: ArcadeGameId; seed?: string }) {
  const info = ARCADE_GAMES[game];
  const { snapshot, loaded } = useProgress();
  const store = useProgressStore();
  const cues = useCues();

  const deckRef = useRef<readonly ArcadeQuestion[]>([]);
  const [state, setState] = useState<ArcadeState>(arcadeStart);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const previousBest = useRef(0);
  const recorded = useRef(false);
  const revealTimer = useRef<number | undefined>(undefined);

  const dispatch = useCallback((action: ArcadeAction) => setState((s) => arcadeStep(s, action, deckRef.current)), []);

  const start = () => {
    deckRef.current = deckFor(game, snapshot, seed ?? `${game}:${Date.now()}`);
    previousBest.current = snapshot.arcade[game]?.best ?? 0;
    recorded.current = false;
    window.clearTimeout(revealTimer.current);
    setReveal(null);
    dispatch({ type: "start" });
  };

  // The clock: real elapsed time, so a slow device does not get a longer round.
  const playing = state.phase === "playing";
  useEffect(() => {
    if (!playing) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      dispatch({ type: "tick", dt: (now - last) / 1000 });
      last = now;
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, dispatch]);

  useEffect(() => () => window.clearTimeout(revealTimer.current), []);

  const question = reveal?.question ?? deckRef.current[state.index];

  const answer = useCallback(
    (optionId: string) => {
      if (state.phase !== "playing" || reveal || !question) return;
      const right = optionId === question.answer;
      cues.play(right ? "correct" : "wrong");
      setReveal({ question, chosen: optionId, right });
      dispatch({ type: "answer", optionId });
      revealTimer.current = window.setTimeout(() => setReveal(null), right ? REVEAL_MS.right : REVEAL_MS.wrong);
    },
    [state.phase, reveal, question, cues, dispatch],
  );

  // Record each finished round once.
  const over = state.phase === "over";
  useEffect(() => {
    if (!over || recorded.current || state.correct + state.wrong === 0) return;
    recorded.current = true;
    cues.play("complete");
    void store.append({
      type: "arcade-played",
      payload: { game, score: state.score, correct: state.correct, wrong: state.wrong, bestStreak: state.bestStreak, xp: arcadeXp(state) },
    });
  }, [over, state, store, game, cues]);

  // Keys: 1–4 answer; Enter starts a round.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return;
      const n = Number(event.key);
      if (state.phase === "playing" && question && n >= 1 && n <= question.options.length) {
        event.preventDefault();
        answer(question.options[n - 1]!.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, question, answer]);

  if (state.phase === "ready") {
    const best = snapshot.arcade[game];
    return (
      <Frame>
        <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted">Arcade</p>
        <h1 className="font-display mt-2 text-4xl font-extrabold tracking-tight text-ink">{info.title}</h1>
        <p className="mt-3 text-muted">{info.blurb}</p>
        <p className="mt-4 rounded-2xl border border-line bg-surface/70 px-4 py-3 text-sm text-ink">{info.rules}</p>
        <p className="mt-4 text-sm text-muted">
          {best ? (
            <>
              Your best: <strong className="text-ink">{best.best}</strong> · longest streak {best.bestStreak}
            </>
          ) : (
            "No rounds yet — set the first score."
          )}
        </p>
        <div className="mt-8 flex w-full flex-col gap-3">
          <Button size="lg" onClick={start} disabled={!loaded} full>
            Start
          </Button>
          <Button tone="quiet" size="lg" href="/practice" full>
            Back to practice
          </Button>
        </div>
        <p className="mt-4 hidden text-xs text-muted sm:block">Keys 1–4 answer.</p>
      </Frame>
    );
  }

  if (over && !reveal) return <Result game={game} state={state} previousBest={previousBest.current} onAgain={start} />;
  if (!question) return null;

  const wide = question.optionStyle === "formula" || question.options.some((o) => o.label.length > 22);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-8 pt-4">
      <header className="flex items-center gap-3">
        <Link href="/practice" aria-label="Stop and go back to practice" className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface-2/60">
          <CloseIcon />
        </Link>
        <Clock timeLeft={state.timeLeft} />
        <Lives lives={state.lives} />
      </header>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-display text-2xl font-extrabold tabular-nums text-ink" aria-label={`Score ${state.score}`}>
          {state.score}
        </span>
        {state.streak >= 2 && (
          <span className="animate-pop flex items-center gap-1 rounded-full bg-angle/15 px-3 py-1 font-display text-sm font-bold text-angle" key={state.streak}>
            <BoltIcon width={14} height={14} />
            {state.streak} in a row
          </span>
        )}
      </div>

      <section key={question.id} className="animate-rise mt-4 rounded-3xl border border-line bg-surface p-5 text-center" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{question.prompt}</p>
        {question.icon && <Pictogram name={question.icon} className="mx-auto mt-3 text-accent" />}
        <p className={`mt-2 text-ink ${question.itemStyle === "formula" ? "math text-3xl" : "font-display text-2xl font-extrabold leading-tight"}`}>{question.item}</p>
        <p className="mt-2 text-xs text-muted">{question.source}</p>
        {/* Always a line tall, so the options do not jump when the verdict appears. */}
        <p className={`mt-2 min-h-5 font-display text-sm font-bold ${reveal?.right ? "text-success" : "text-cosine"}`}>
          {reveal ? (reveal.right ? "Right!" : `Not quite — ${question.options.find((o) => o.id === question.answer)?.label}`) : ""}
        </p>
      </section>

      <div className={`mt-4 grid gap-3 ${wide ? "grid-cols-1" : "grid-cols-2"}`}>
        {question.options.map((option, i) => {
          const isAnswer = option.id === question.answer;
          const tone = !reveal
            ? "border-line bg-surface hover:border-accent"
            : isAnswer
              ? "border-success bg-success/15"
              : option.id === reveal.chosen
                ? "border-cosine bg-cosine/15"
                : "border-line bg-surface opacity-60";
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => answer(option.id)}
              disabled={!!reveal}
              className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${tone}`}
            >
              <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs font-bold text-muted">
                {i + 1}
              </span>
              <span className={`text-ink ${question.optionStyle === "formula" ? "math text-xl" : "font-display text-base font-bold leading-tight"}`}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">{children}</main>;
}

function Clock({ timeLeft }: { timeLeft: number }) {
  const fraction = Math.max(0, Math.min(1, timeLeft / ARCADE_SECONDS));
  const low = timeLeft <= 10;
  return (
    <div className="flex flex-1 items-center gap-2" role="timer" aria-label={`${Math.ceil(timeLeft)} seconds left`}>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${low ? "bg-cosine" : "bg-accent"}`} style={{ width: `${fraction * 100}%` }} />
      </div>
      <span className={`w-8 text-right font-display text-sm font-bold tabular-nums ${low ? "text-cosine" : "text-muted"}`}>{Math.ceil(timeLeft)}</span>
    </div>
  );
}

function Lives({ lives }: { lives: number }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${lives} of ${ARCADE_LIVES} lives left`}>
      {Array.from({ length: ARCADE_LIVES }, (_, i) => (
        <HeartIcon key={i} width={20} height={20} className={i < lives ? "fill-cosine text-cosine" : "text-line"} />
      ))}
    </div>
  );
}

const ENDING = { time: "Time!", lives: "Out of lives", deck: "You cleared the deck!" } as const;

function Result({ game, state, previousBest, onAgain }: { game: ArcadeGameId; state: ArcadeState; previousBest: number; onAgain: () => void }) {
  const info = ARCADE_GAMES[game];
  const isBest = state.score > previousBest;
  return (
    <Frame>
      <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted">{info.title}</p>
      <h1 className="animate-pop font-display mt-2 text-4xl font-extrabold tracking-tight text-ink">{ENDING[state.ended ?? "time"]}</h1>
      <p className="font-display mt-6 flex items-center gap-2 text-6xl font-extrabold tabular-nums text-ink">
        <TargetIcon className="text-accent" width={36} height={36} />
        {state.score}
      </p>
      {state.score > 0 && (
        <p className={`mt-2 text-sm font-semibold ${isBest ? "text-success" : "text-muted"}`}>
          {isBest ? (previousBest > 0 ? "New personal best!" : "First score on the board!") : `Your best: ${previousBest}`}
        </p>
      )}
      <dl className="mt-8 grid w-full grid-cols-3 gap-3">
        <Stat label="Right" value={`${state.correct}/${state.correct + state.wrong}`} />
        <Stat label="Streak" value={String(state.bestStreak)} />
        <Stat label="XP" value={`+${arcadeXp(state)}`} />
      </dl>
      <div className="mt-10 flex w-full flex-col gap-3">
        <Button tone="success" size="lg" onClick={onAgain} full>
          Play again
        </Button>
        <Button tone="quiet" size="lg" href="/practice" full>
          Back to practice
        </Button>
      </div>
    </Frame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="animate-rise rounded-2xl border border-line bg-surface px-2 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="font-display mt-1 text-xl font-extrabold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
