import { EffectivenessDashboard } from "@/components/effectiveness-dashboard"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <EffectivenessDashboard />
      </div>
    </div>
  )
}
