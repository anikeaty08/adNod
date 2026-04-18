import { redirect } from "next/navigation";

export default function DeveloperRedirectPage() {
  redirect("/app/publisher");
}
