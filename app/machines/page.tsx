import RawPage from "../RawPage";
import { partial } from "../content";

export const metadata = {
  title: "Rooted machines — Operator",
};

export default function MachinesPage() {
  return (
    <RawPage
      html={partial("machines.html")}
      preScripts={["/asciinema-player.min.js"]}
      scriptSrc="/machines.page.js"
    />
  );
}
