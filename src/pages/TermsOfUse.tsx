import Layout from "@/components/Layout";

const TermsOfUse = () => (
  <Layout>
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">
        Conditions Générales d'Utilisation
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Dernière mise à jour : septembre 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">1. Présentation</h2>
          <p>
            La plateforme <strong>terra-materriaux.com</strong> est éditée par Terra Matériaux
            International (TMI), entreprise commerciale établie au Sénégal, spécialisée dans la vente
            de matériaux de construction, produits agricoles, équipements électriques et textiles.
          </p>
          <p className="mt-2 text-muted-foreground">
            [Mentions légales complètes : NINEA, forme juridique, adresse siège à compléter]
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">2. Acceptation des conditions</h2>
          <p>
            L'accès et l'utilisation de la plateforme impliquent l'acceptation pleine et entière des
            présentes Conditions Générales d'Utilisation. Si vous n'acceptez pas ces conditions,
            vous devez cesser toute utilisation de la plateforme.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">3. Accès au service</h2>
          <p>
            La plateforme est accessible à tout utilisateur disposant d'un accès à internet. TMI se
            réserve le droit de suspendre ou d'interrompre l'accès pour maintenance ou en cas de
            comportement contraire aux présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">4. Commandes et paiements</h2>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>
              Toute commande passée sur la plateforme constitue un engagement d'achat ferme, sous
              réserve de confirmation par TMI.
            </li>
            <li>
              Le paiement s'effectue par Wave, Orange Money, virement bancaire ou espèces selon les
              modalités précisées lors de la commande.
            </li>
            <li>
              La preuve de paiement doit être transmise via la plateforme pour validation de la commande.
            </li>
            <li>
              TMI se réserve le droit d'annuler toute commande en cas de rupture de stock, d'erreur de
              prix manifeste ou d'impossibilité de livraison.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">5. Livraison</h2>
          <p>
            Les délais et tarifs de livraison sont indiqués lors de la commande. TMI s'engage à tout
            mettre en œuvre pour respecter ces délais sans pouvoir les garantir en cas de force majeure
            ou de circonstances indépendantes de sa volonté.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">6. Responsabilités</h2>
          <p>
            TMI ne saurait être tenu responsable des dommages indirects liés à l'utilisation de la
            plateforme. L'utilisateur est responsable de l'exactitude des informations communiquées
            lors de son inscription et de ses commandes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">7. Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus présents sur la plateforme (textes, images, logo, interface) est
            la propriété de TMI ou de ses partenaires et est protégé par les lois applicables.
            Toute reproduction non autorisée est interdite.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">8. Droit applicable</h2>
          <p>
            Les présentes CGU sont soumises au droit sénégalais. Tout litige sera soumis aux
            juridictions compétentes du Sénégal.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">9. Modifications</h2>
          <p>
            TMI se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
            seront informés de toute modification substantielle.
          </p>
        </section>

        <section className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            Ce document est un modèle structuré. Il doit être complété avec les informations exactes
            de l'entreprise et validé si nécessaire par un professionnel juridique compétent.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default TermsOfUse;
