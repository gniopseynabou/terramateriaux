import Layout from "@/components/Layout";

const PrivacyPolicy = () => (
  <Layout>
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">
        Politique de confidentialité
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Dernière mise à jour : septembre 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">1. Responsable du traitement</h2>
          <p>
            Terra Matériaux International (TMI), entreprise commerciale établie au Sénégal, est responsable
            du traitement des données personnelles collectées via la plateforme{" "}
            <strong>www.terra-materriaux.com</strong>.
          </p>
          <p className="mt-2 text-muted-foreground">
            [Contact : à compléter avec l'adresse email officielle et l'adresse postale de l'entreprise]
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">2. Données collectées</h2>
          <p>Dans le cadre de l'utilisation de notre plateforme, nous collectons les données suivantes :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Adresse email et mot de passe (compte utilisateur)</li>
            <li>Nom et prénom (profil)</li>
            <li>Numéro de téléphone (livraison et contact)</li>
            <li>Adresse de livraison</li>
            <li>Historique des commandes</li>
            <li>Preuves de paiement téléchargées</li>
            <li>Données de navigation (pages consultées, paniers)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">3. Finalités du traitement</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Gérer votre compte et vous authentifier</li>
            <li>Traiter et suivre vos commandes</li>
            <li>Organiser la livraison de vos achats</li>
            <li>Vous contacter en cas de besoin relatif à votre commande</li>
            <li>Améliorer notre service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">4. Conservation des données</h2>
          <p>
            Vos données sont conservées pendant la durée nécessaire à l'exécution du contrat et, au-delà,
            pendant la durée légalement requise (facturation, litiges commerciaux). Les données de compte
            inactif depuis plus de 3 ans pourront être supprimées.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">5. Partage des données</h2>
          <p>
            Vos données ne sont pas vendues à des tiers. Elles peuvent être partagées avec :
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Les livreurs assignés à votre commande (nom et téléphone uniquement)</li>
            <li>Nos prestataires techniques (Supabase pour la base de données, Netlify pour l'hébergement)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">6. Vos droits</h2>
          <p>Vous disposez des droits suivants sur vos données personnelles :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (« droit à l'oubli »)</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition au traitement</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Pour exercer ces droits, contactez-nous à :{" "}
            <strong>[adresse email à compléter]</strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">7. Sécurité</h2>
          <p>
            Nous mettons en œuvre des mesures techniques appropriées pour protéger vos données :
            chiffrement HTTPS, authentification sécurisée, contrôle d'accès strict aux données (RLS).
          </p>
        </section>

        <section className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            Ce document est un modèle structuré. Il doit être complété avec les informations exactes
            de l'entreprise et, si nécessaire, validé par un professionnel compétent avant d'être
            considéré comme conforme aux exigences réglementaires applicables.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default PrivacyPolicy;
