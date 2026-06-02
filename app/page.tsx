import RawPage from "./RawPage";
import { partial } from "./content";

export default function HomePage() {
  return <RawPage html={partial("home.html")} scriptSrc="/home.page.js" />;
}
