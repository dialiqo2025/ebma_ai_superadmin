import { AdminPlanEditorPage } from "@/components/admin-plan-editor";
export default async function Page({ params }: { params: Promise<{ plan_uuid: string }> }) {
  const { plan_uuid } = await params;
  return <AdminPlanEditorPage editId={plan_uuid} />;
}
