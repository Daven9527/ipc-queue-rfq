import RfqNew from "../../_components/RfqNew";

export const dynamic = "force-dynamic";

export default function SystemRfqNewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <RfqNew area="system" />
      </div>
    </div>
  );
}

