import { TransactionDetailsPage } from "@/components/transaction-details-page";
export default async function Page({ params }: { params: Promise<{ transaction_uuid: string }> }) { const { transaction_uuid } = await params; return <TransactionDetailsPage transactionUuid={transaction_uuid} />; }
