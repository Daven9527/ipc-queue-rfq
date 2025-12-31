import RfqDetail from "../../_components/RfqDetail";
import type { RfqArea } from "../../_components/types";

export const dynamic = "force-dynamic";

export default async function SystemRfqDetailPage({ params }: { params: Promise<{ rfqNo: string }> }) {
  const { rfqNo } = await params;
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <RfqDetail area={"system" as RfqArea} rfqNo={decodeURIComponent(rfqNo)} />
      </div>
    </div>
  );
}

