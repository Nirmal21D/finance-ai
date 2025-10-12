export default function Features() {
  const features = [
    {
      title: "Track Spending",
      desc: "Log and review transactions with clean summaries and clear monthly totals.",
    },
    {
      title: "Smart Categories",
      desc: "Stay organized with simple, consistent categories for faster insights.",
    },
    {
      title: "Visual Reports",
      desc: "See trends at a glance with charts that make patterns obvious.",
    },
  ]

  return (
    <section className="bg-background text-foreground border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border p-6 md:p-7 bg-card">
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
