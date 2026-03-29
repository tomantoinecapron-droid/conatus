export default function Home() {
  return (
    <div className="min-h-screen bg-[#1a1714] flex flex-col items-center justify-center px-6">
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-serif text-white tracking-tight">
          con<span className="text-[#c9440e]">a</span>tus
        </h1>
        <p className="text-[#7a7268] mt-3 text-lg italic">
          « la tendance à persévérer dans son être »
        </p>
      </div>
      <div className="text-center mb-12 max-w-md">
        <p className="text-white text-xl leading-relaxed">Tes lectures. Tes fiches. Ton monde.</p>
        <p className="text-[#7a7268] mt-2 text-base">Le journal de bord des lecteurs qui pensent.</p>
      </div>
      <div className="flex gap-4">
        <a href="/auth" className="bg-[#c9440e] text-white px-8 py-3 rounded-full text-base font-medium hover:opacity-90 transition">Commencer</a>
        <a href="/auth" className="border border-white/20 text-white px-8 py-3 rounded-full text-base font-medium hover:bg-white/10 transition">Se connecter</a>
      </div>
    </div>
  )
}
