import { Building2, MapPin, Target, Users, Globe, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import logo from "@/assets/logo.jpeg?w=192&format=webp";

const About = () => (
  <Layout>
    <section className="tmi-gradient-green py-16 md:py-24">
      <div className="container mx-auto px-4 text-center">
        <img src={logo} alt="T.M.I" width={96} height={96} loading="lazy" decoding="async" className="h-24 w-24 rounded-full object-cover mx-auto mb-6 border-4 border-primary" />
        <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-secondary-foreground mb-4">
          À propos de T.M.I
        </h1>
        <p className="text-secondary-foreground/80 max-w-2xl mx-auto text-lg">
          Terra Matériaux International — Solutions durables et innovantes au service du développement africain.
        </p>
      </div>
    </section>

    <section className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
      <div className="prose prose-lg max-w-none space-y-6 text-foreground/80">
        <p>
          <strong>Terra Matériaux International (T.M.I)</strong> est une entreprise multisectorielle basée à Kédougou, au Sénégal,
          engagée dans la création de solutions durables et innovantes au service du développement.
        </p>
        <p>
          Présente dans les secteurs de la <strong>construction</strong>, de l'<strong>agriculture</strong>, de l'<strong>agro-alimentaire</strong>,
          de l'<strong>électricité</strong>, de la <strong>plomberie</strong>, du <strong>commerce général</strong> et bien d'autres,
          T.M.I se positionne comme un acteur clé du développement économique local et régional.
        </p>
        <p>
          Notre mission est de fournir des produits de qualité à des prix compétitifs, aussi bien en gros qu'en détail,
          tout en garantissant un service fiable et une livraison rapide sur l'ensemble du territoire sénégalais et au-delà.
        </p>
      </div>
    </section>

    <section className="bg-muted/50">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "Notre Mission", desc: "Offrir des solutions durables et accessibles pour le développement africain." },
            { icon: Users, title: "Notre Équipe", desc: "Des professionnels passionnés, experts dans leurs domaines respectifs." },
            { icon: MapPin, title: "Notre Siège", desc: "Basés à Kédougou, au cœur du Sénégal oriental." },
            { icon: Globe, title: "Rayonnement", desc: "Actifs au Sénégal et à l'international, avec des partenaires en Afrique et en Europe." },
            { icon: Leaf, title: "Engagement durable", desc: "Respect de l'environnement et développement responsable au cœur de notre stratégie." },
            { icon: Building2, title: "Multi-sectoriel", desc: "BTP, agriculture, commerce, électricité, beauté — un guichet unique." },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card p-6 rounded-lg border border-border"
            >
              <item.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-heading font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default About;
