import Layout from "@/components/Layout";

const CookiePolicy = () => (
  <Layout>
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">
        Politique des cookies
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Dernière mise à jour : septembre 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">1. Qu'est-ce qu'un cookie ?</h2>
          <p>
            Un cookie est un petit fichier texte déposé sur votre navigateur lors de la visite d'un
            site web. Il permet au site de mémoriser des informations sur votre visite afin d'améliorer
            votre expérience.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">2. Cookies utilisés par notre plateforme</h2>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-1">Cookies essentiels (nécessaires)</h3>
              <p className="text-sm text-muted-foreground">
                Ces cookies sont indispensables au fonctionnement de la plateforme. Ils permettent
                notamment de maintenir votre session de connexion, de conserver votre panier d'achat
                (stockage local), et d'assurer la sécurité des échanges. Ils ne peuvent pas être
                désactivés sans affecter le fonctionnement du site.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-1">Cookies de préférence</h3>
              <p className="text-sm text-muted-foreground">
                Ces cookies mémorisent vos préférences (langue, mode d'affichage) pour améliorer
                votre expérience lors de vos prochaines visites.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-1">Cookies analytiques</h3>
              <p className="text-sm text-muted-foreground">
                La plateforme peut utiliser des outils d'analyse pour comprendre comment les
                visiteurs utilisent le site (pages consultées, durée de visite). Ces données sont
                anonymisées et utilisées uniquement pour améliorer le service.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">3. Stockage local (localStorage)</h2>
          <p>
            Notre plateforme utilise le <strong>stockage local de votre navigateur</strong> (localStorage)
            pour conserver votre panier d'achat pendant 7 jours. Ces données ne quittent pas votre
            appareil et ne sont pas partagées avec des tiers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">4. Gestion de vos cookies</h2>
          <p>
            Vous pouvez contrôler et supprimer les cookies via les paramètres de votre navigateur.
            Notez que la désactivation des cookies essentiels peut altérer le fonctionnement
            de la plateforme (perte de session, panier vide).
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Liens vers la gestion des cookies des principaux navigateurs :{" "}
            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary underline">Chrome</a>{" · "}
            <a href="https://support.mozilla.org/fr/kb/effacer-les-cookies-pour-supprimer-les-information" target="_blank" rel="noopener noreferrer" className="text-primary underline">Firefox</a>{" · "}
            <a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary underline">Safari</a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">5. Contact</h2>
          <p className="text-muted-foreground">
            Pour toute question relative à notre utilisation des cookies, contactez-nous à :{" "}
            <strong>[adresse email à compléter]</strong>
          </p>
        </section>

        <section className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            Ce document est un modèle structuré. Il doit être complété avec les informations exactes
            de l'entreprise et validé si nécessaire par un professionnel compétent.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default CookiePolicy;
