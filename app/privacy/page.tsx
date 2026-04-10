export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#1a1714] text-white flex flex-col">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5">
        <a href="/" className="font-serif text-2xl tracking-tight">
          con<span className="text-[#c9440e]">a</span>tus
        </a>
        <a href="/auth" className="text-[#7a7268] text-sm hover:text-white transition">
          Se connecter
        </a>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-12 max-w-2xl mx-auto w-full">

        <p className="text-[#c9440e] text-xs font-medium tracking-[0.2em] uppercase mb-6">
          Politique de confidentialité
        </p>
        <h1 className="font-serif text-3xl text-white mb-3 leading-snug">
          Tes données t&apos;appartiennent.
        </h1>
        <p className="text-[#7a7268] text-sm mb-12">
          Dernière mise à jour : avril 2026
        </p>

        <div className="flex flex-col gap-10 text-sm leading-relaxed text-[#9a9088]">

          <section>
            <h2 className="font-serif text-base text-white mb-3">Ce que nous collectons</h2>
            <p>
              Conatus collecte uniquement les données nécessaires au fonctionnement du service :
              ton adresse e-mail (pour l&apos;authentification), les livres que tu ajoutes,
              tes notes et fiches de lecture, et les sessions de lecture que tu enregistres.
              Aucune donnée de navigation, aucun tracking publicitaire.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-base text-white mb-3">Comment nous utilisons tes données</h2>
            <p className="mb-3">
              Tes données servent exclusivement à faire fonctionner ton compte Conatus :
            </p>
            <ul className="flex flex-col gap-2 pl-4">
              {[
                'Afficher ta bibliothèque, tes fiches et tes statistiques de lecture',
                'Permettre le partage social avec les lecteurs que tu choisis de suivre',
                "T\u2019envoyer des notifications si tu les actives",
                'Améliorer le service (données anonymisées et agrégées uniquement)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[#c9440e] mt-0.5 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-base text-white mb-3">Stockage et sécurité</h2>
            <p>
              Tes données sont hébergées sur{' '}
              <span className="text-white">Supabase</span> (infrastructure sécurisée,
              chiffrement en transit et au repos). Nous ne vendons ni ne partageons tes
              données avec des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-base text-white mb-3">Tes droits</h2>
            <p className="mb-3">
              Conformément au RGPD, tu peux à tout moment :
            </p>
            <ul className="flex flex-col gap-2 pl-4">
              {[
                'Accéder à l\'ensemble des données associées à ton compte',
                'Corriger ou mettre à jour tes informations',
                'Demander la suppression complète de ton compte et de tes données',
                'Exporter tes données dans un format lisible',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[#c9440e] mt-0.5 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              Pour exercer ces droits, écris-nous à{' '}
              <a
                href="mailto:tomantoinecapron@gmail.com"
                className="text-white hover:text-[#c9440e] transition underline underline-offset-2"
              >
                tomantoinecapron@gmail.com
              </a>
              . Nous répondons sous 30 jours.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-base text-white mb-3">Cookies</h2>
            <p>
              Conatus utilise uniquement les cookies strictement nécessaires à
              l&apos;authentification et au maintien de ta session. Aucun cookie
              publicitaire ou de suivi tiers n&apos;est déposé.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-base text-white mb-3">Contact</h2>
            <p>
              Pour toute question relative à cette politique, contacte-nous à{' '}
              <a
                href="mailto:tomantoinecapron@gmail.com"
                className="text-white hover:text-[#c9440e] transition underline underline-offset-2"
              >
                tomantoinecapron@gmail.com
              </a>
              .
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 flex items-center justify-between">
        <span className="font-serif text-base text-white/50">
          con<span className="text-[#c9440e]">a</span>tus
        </span>
        <div className="flex items-center gap-5">
          <a href="/" className="text-[#7a7268] text-xs hover:text-white transition">
            Accueil
          </a>
          <p className="text-[#7a7268] text-xs">© 2026</p>
        </div>
      </footer>

    </div>
  )
}
