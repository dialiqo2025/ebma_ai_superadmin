import { redirect } from "next/navigation";

export default async function Authentication({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  await searchParams;
  redirect("/");
}
