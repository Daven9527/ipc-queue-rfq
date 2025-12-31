import RfqList from "../_components/RfqList";

export const dynamic = "force-dynamic";

export default function MbRfqPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <RfqList area="mb" />
      </div>
    </div>
  );
}

