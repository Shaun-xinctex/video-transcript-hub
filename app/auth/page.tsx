import { redirect } from "next/navigation";

/** Legacy path from the TanStack build — kept so old links still land. */
export default function LegacyAuthPage() {
  redirect("/sign-in");
}
