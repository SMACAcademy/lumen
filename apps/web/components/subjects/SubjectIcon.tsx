import type { Subject } from "@ise/content";
import type { SVGProps } from "react";
import { AtomIcon, FlaskIcon, SigmaIcon } from "../icons";

const ICONS = { maths: SigmaIcon, physics: AtomIcon, chemistry: FlaskIcon } as const;

/** The symbol each subject is known by: Σ, an atom, a flask. */
export function SubjectIcon({ subject, ...rest }: { subject: Subject } & SVGProps<SVGSVGElement>) {
  const Icon = ICONS[subject];
  return <Icon {...rest} />;
}
