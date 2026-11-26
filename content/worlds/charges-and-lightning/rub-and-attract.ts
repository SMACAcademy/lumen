import { defineLevel } from "@ise/game-engine";

const card = (id: string, label: string) => ({ id, label });

/** Charges and Lightning, level 1: charging by rubbing, and like and unlike charges. */
export const rubAndAttract = defineLevel({
  schemaVersion: 1,
  id: "rub-and-attract",
  concept: "charges-and-lightning",
  title: "Rub and attract",
  summary: "Rub a balloon with wool and it picks up paper. Find out why, and which charged things pull or push.",
  xp: 30,
  steps: [
    {
      id: "rub-it",
      kind: "explore",
      prompt: "A balloon sits above some bits of paper. **Rub it** with wool until it picks up **5 bits**.",
      mode: "rub",
      given: { item: "balloon", rubs: 0 },
      controls: ["rubs"],
      canvas: false,
      goal: { type: "compare", quantity: "paperBits", op: "gte", value: 5 },
      success: "10 rubs moved 20 units of charge onto the balloon, and the wool got the same amount of the other kind. The charged balloon lifts 5 bits.",
      hints: ["Slide the number of rubs up."],
    },
    {
      id: "more-rubs",
      kind: "predict",
      prompt: "You rub the balloon **4 times**, then **12 times**. What happens to the bits of paper it picks up?",
      mode: "rub",
      variable: "rubs",
      from: 4,
      to: 12,
      quantity: "paperBits",
      options: ["increase", "decrease", "same"],
      given: { item: "balloon" },
      explanation: "It picks up more: 2 bits, then 6. More rubs move more charge, and more charge lifts more paper.",
    },
    {
      id: "does-it-lift",
      kind: "sort",
      prompt: "Each is rubbed **10 times** unless it says not. **Sort** them: does it pick up bits of paper?",
      mode: "rub",
      given: { rubs: 10 },
      canvas: false,
      hideLabels: true,
      bins: [
        { id: "lifts", label: "Picks up paper", when: { type: "compare", quantity: "paperBits", op: "gte", value: 1 } },
        { id: "not", label: "Does not", when: { type: "compare", quantity: "paperBits", op: "eq", value: 0 } },
      ],
      cards: [
        { id: "balloon", label: "Balloon rubbed with wool", given: { item: "balloon" } },
        { id: "refill", label: "Pen refill rubbed with polythene", given: { item: "refill" } },
        { id: "comb", label: "Plastic comb run through dry hair", given: { item: "comb" } },
        { id: "glass", label: "Glass rod rubbed with silk", given: { item: "glass" } },
        { id: "spoon", label: "Steel spoon rubbed with polythene", icon: "spoon", given: { item: "spoon" } },
        { id: "plain", label: "Balloon not rubbed at all", given: { item: "balloon", rubs: 0 } },
      ],
      explanation:
        "The rubbed balloon, refill, comb and glass rod are charged, so each picks up 5 bits. The spoon is a metal in your hand: its charge flows away through you. And a balloon that is not rubbed has no charge.",
      hints: ["Rubbing charges plastic, rubber and glass.", "A metal held in the hand loses its charge."],
    },
    {
      id: "pull-or-push",
      kind: "sort",
      prompt: "Each pair is hung up side by side. **Sort** them: do they attract or repel?",
      mode: "pair",
      given: { rubs: 10 },
      canvas: false,
      hideLabels: true,
      bins: [
        { id: "attract", label: "Attract", when: { type: "compare", quantity: "interaction", op: "eq", value: 1 } },
        { id: "repel", label: "Repel", when: { type: "compare", quantity: "interaction", op: "eq", value: -1 } },
      ],
      cards: [
        { id: "two-balloons", label: "Two balloons, both rubbed with wool", given: { item: "balloon", partner: "balloon" } },
        { id: "two-refills", label: "Two refills, both rubbed with polythene", given: { item: "refill", partner: "refill" } },
        { id: "balloon-refill", label: "A rubbed balloon and a rubbed refill", given: { item: "balloon", partner: "refill" } },
        { id: "glass-balloon", label: "A rubbed glass rod and a rubbed balloon", given: { item: "glass", partner: "balloon" } },
        { id: "comb-balloon", label: "A charged comb and a rubbed balloon", given: { item: "comb", partner: "balloon" } },
        { id: "balloon-paper", label: "A rubbed balloon and a bit of paper", given: { item: "balloon", partner: "paper" } },
      ],
      explanation:
        "A balloon rubbed with wool and a comb run through hair get negative charge; a glass rod rubbed with silk gets positive. The rubbed refill attracts the rubbed balloon, so it has the other kind: positive here. Like charges repel, unlike charges attract — and a charged balloon pulls an uncharged bit of paper.",
      hints: ["Two things rubbed the same way have the same kind of charge."],
    },
    {
      id: "charge-facts",
      kind: "match",
      prompt: "**Match** each start to its ending.",
      canvas: false,
      pairs: [
        { left: card("rubbing", "Rubbing two things together"), right: card("moves", "moves charge from one to the other") },
        { left: card("like", "Like charges"), right: card("repel", "repel") },
        { left: card("unlike", "Unlike charges"), right: card("attract", "attract") },
        { left: card("glass", "A glass rod rubbed with silk"), right: card("positive", "is called positive") },
      ],
      explanation:
        "Rubbing moves charge, so one thing becomes negative and the other positive. By an old agreement, the charge on glass rubbed with silk is called positive.",
      hints: ["Like and unlike, as with magnets' poles."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "The rule for charges.",
      mode: "pair",
      equation: "like-unlike",
      law: "Rubbing moves charge from one thing to the other. Like charges repel and unlike charges attract.",
    },
  ],
});
