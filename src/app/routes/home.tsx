import { useNavigate } from "react-router";
import { knots } from "../../engine/knots";
import { HomeScreen } from "../screens/HomeScreen";
import { useMountEffect } from "../shared/hooks";
import { homeMeta } from "../shared/meta";
import { knotPath } from "../shared/site";

export const meta = () => homeMeta(knots[0]);

export default function Home() {
  const navigate = useNavigate();
  // Links from before knots had their own pages used ?knot=<id>; send them to that page.
  useMountEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("knot");
    if (!id || !knots.some((k) => k.id === id)) return;
    params.delete("knot");
    const rest = params.toString().replace("tune=", "tune");
    navigate(`${knotPath(id)}${rest ? `?${rest}` : ""}`, { replace: true });
  });
  return <HomeScreen />;
}
