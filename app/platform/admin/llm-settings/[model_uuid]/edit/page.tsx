import { AdminLlmModelEditor } from "@/components/admin-llm-models";
export default async function Page({ params }: { params: Promise<{ model_uuid: string }> }) { const { model_uuid } = await params; return <AdminLlmModelEditor editId={model_uuid} />; }
