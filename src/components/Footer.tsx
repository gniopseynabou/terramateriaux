import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import logo from "@/assets/logo.jpeg?w=96&format=webp";
import { useCommunicationSettings } from "@/hooks/useCommunicationSettings";

const Footer = () => {
  const { data: communication } = useCommunicationSettings();
  const rawNumber = communication?.whatsapp_number.replace(/[^0-9]/g, "") ?? "";
  const whatsappNumber = rawNumber.length === 9 ? `221${rawNumber}` : rawNumber;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(communication?.whatsapp_message ?? "Bonjour Terra Matériaux International.")}`
    : undefined;
  const displayedNumber = communication?.whatsapp_number || "Numéro WhatsApp non configuré";
  const publicEmail = communication?.public_email || "contact@tmi-senegal.com";

  return (
  <footer className="bg-secondary text-secondary-foreground">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="T.M.I" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 rounded-full object-cover" />
            <span className="font-heading font-bold text-lg text-primary">T.M.I</span>
          </div>
          <p className="text-sm text-secondary-foreground/80">
            Terra Matériaux International - Solutions durables et innovantes au service du développement.
          </p>
        </div>

        <div>
          <h4 className="font-heading font-semibold mb-4 text-primary">Navigation</h4>
          <ul className="space-y-2 text-sm text-secondary-foreground/80">
            <li><Link to="/" className="hover:text-primary transition-colors">Accueil</Link></li>
            <li><Link to="/catalogue" className="hover:text-primary transition-colors">Catalogue</Link></li>
            <li><Link to="/a-propos" className="hover:text-primary transition-colors">À propos</Link></li>
            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-semibold mb-4 text-primary">Catégories</h4>
          <ul className="space-y-2 text-sm text-secondary-foreground/80">
            <li><Link to="/catalogue/materiaux-construction" className="hover:text-primary transition-colors">Matériaux de construction</Link></li>
            <li><Link to="/catalogue/electricite" className="hover:text-primary transition-colors">Électricité</Link></li>
            <li><Link to="/catalogue/plomberie" className="hover:text-primary transition-colors">Plomberie</Link></li>
            <li><Link to="/catalogue/agriculture" className="hover:text-primary transition-colors">Agriculture</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-semibold mb-4 text-primary">Contact</h4>
          <ul className="space-y-3 text-sm text-secondary-foreground/80">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                  <span>{displayedNumber}</span><MessageCircle className="h-3.5 w-3.5" aria-label="Contacter sur WhatsApp" />
                </a>
              ) : <span>{displayedNumber}</span>}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a href={`mailto:${publicEmail}`} className="hover:text-primary transition-colors">
                {publicEmail}
              </a>
            </li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Kédougou, Sénégal</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-secondary-foreground/20 mt-8 pt-6 text-center text-xs text-secondary-foreground/60">
        © {new Date().getFullYear()} Terra Matériaux International. Tous droits réservés.
      </div>
    </div>
  </footer>
  );
};

export default Footer;
