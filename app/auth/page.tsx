import { redirect } from "next/navigation";

export default async function Authentication({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "?mode=signup" : "";
  redirect(`/${mode}`);
}
