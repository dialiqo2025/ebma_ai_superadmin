import { AdminGpuOperationDetails } from "@/components/admin-gpu-operation-details";

export default async function Page({ params }: { params: Promise<{ service: string; operation_uuid: string }> }) {
  const { service, operation_uuid } = await params;
  return <AdminGpuOperationDetails service={service} operationUuid={operation_uuid} />;
}
