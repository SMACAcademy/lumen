import { PICTOGRAMS } from "@ise/game-engine";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Pictogram } from "./Pictogram";

afterEach(cleanup);

describe("Pictogram", () => {
  it("draws every picture a card may name", () => {
    for (const name of PICTOGRAMS) {
      const { container, unmount } = render(<Pictogram name={name} />);
      const svg = container.querySelector(`svg[data-pictogram="${name}"]`);
      expect(svg, name).not.toBeNull();
      expect(svg!.querySelectorAll("path, circle, rect, ellipse").length, name).toBeGreaterThan(0);
      unmount();
    }
  });
});
