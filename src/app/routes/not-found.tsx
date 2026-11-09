import { Link } from "react-router";
import { knotPath } from "../shared/site";
import { knots } from "../../engine/knots";
import styles from "./not-found.module.css";

export const meta = () => [{ title: "Not found · Knots Made Easy" }];

export function NotFound() {
  return (
    <main className={styles.page}>
      <h1>This knot isn’t here</h1>
      <p>
        Start with the <Link to={knotPath(knots[0].id)}>{knots[0].name.toLowerCase()}</Link>.
      </p>
    </main>
  );
}

export default NotFound;
