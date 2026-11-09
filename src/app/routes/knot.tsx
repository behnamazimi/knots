import { knots } from "../../engine/knots";
import { KnotScreen } from "../screens/KnotScreen";
import { knotMeta } from "../shared/meta";
import { NotFound } from "./not-found";
import type { Route } from "./+types/knot";

const findKnot = (id: string | undefined) => knots.find((k) => k.id === id);

export const meta: Route.MetaFunction = ({ params }) => {
  const knot = findKnot(params.id);
  return knot ? knotMeta(knot) : [{ title: "Not found · Knots Made Easy" }];
};

export default function KnotRoute({ params }: Route.ComponentProps) {
  const knot = findKnot(params.id);
  return knot ? <KnotScreen knot={knot} /> : <NotFound />;
}
