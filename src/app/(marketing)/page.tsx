import { redirect } from "next/navigation";

/**
 * The entry point is the "Choose your starting point" picker — the marketing
 * hero was removed so visitors land straight on the experience selector.
 */
export default function RootPage() {
  redirect("/signup");
}
