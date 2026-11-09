import { Recorder } from "../features/recorder";
import { SITE_NAME } from "../shared/site";

export const meta = () => [
  { title: `Knot playground · ${SITE_NAME}` },
  { name: "robots", content: "noindex" },
];

export default function RecorderRoute() {
  return <Recorder />;
}
