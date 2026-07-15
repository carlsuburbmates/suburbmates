import { permanentRedirect } from "next/navigation";

export default function BrowseRedirectPage() {
  permanentRedirect("/businesses");
}
