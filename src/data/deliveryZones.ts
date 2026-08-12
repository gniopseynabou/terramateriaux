export interface DeliveryZone {
  region: string;
  cities: { name: string; fee: number }[];
}

export const deliveryZones: DeliveryZone[] = [
  {
    region: "Kédougou",
    cities: [
      { name: "Kédougou Centre", fee: 2000 },
      { name: "Saraya", fee: 5000 },
      { name: "Salémata", fee: 5000 },
      { name: "Bandafassi", fee: 4000 },
    ],
  },
  {
    region: "Tambacounda",
    cities: [
      { name: "Tambacounda", fee: 8000 },
      { name: "Bakel", fee: 12000 },
      { name: "Goudiry", fee: 10000 },
      { name: "Koumpentoum", fee: 9000 },
    ],
  },
  {
    region: "Kolda",
    cities: [
      { name: "Kolda", fee: 10000 },
      { name: "Vélingara", fee: 8000 },
      { name: "Médina Yoro Foulah", fee: 11000 },
    ],
  },
  {
    region: "Ziguinchor",
    cities: [
      { name: "Ziguinchor", fee: 15000 },
      { name: "Bignona", fee: 14000 },
      { name: "Oussouye", fee: 16000 },
    ],
  },
  {
    region: "Kaolack",
    cities: [
      { name: "Kaolack", fee: 12000 },
      { name: "Nioro du Rip", fee: 13000 },
      { name: "Guinguinéo", fee: 12000 },
    ],
  },
  {
    region: "Thiès",
    cities: [
      { name: "Thiès", fee: 15000 },
      { name: "Mbour", fee: 16000 },
      { name: "Tivaouane", fee: 15000 },
    ],
  },
  {
    region: "Dakar",
    cities: [
      { name: "Dakar", fee: 20000 },
      { name: "Pikine", fee: 20000 },
      { name: "Guédiawaye", fee: 20000 },
      { name: "Rufisque", fee: 18000 },
    ],
  },
  {
    region: "Saint-Louis",
    cities: [
      { name: "Saint-Louis", fee: 18000 },
      { name: "Dagana", fee: 17000 },
      { name: "Podor", fee: 19000 },
    ],
  },
  {
    region: "Matam",
    cities: [
      { name: "Matam", fee: 15000 },
      { name: "Kanel", fee: 14000 },
      { name: "Ranérou", fee: 13000 },
    ],
  },
  {
    region: "Fatick",
    cities: [
      { name: "Fatick", fee: 13000 },
      { name: "Foundiougne", fee: 14000 },
      { name: "Gossas", fee: 12000 },
    ],
  },
  {
    region: "Kaffrine",
    cities: [
      { name: "Kaffrine", fee: 11000 },
      { name: "Birkelane", fee: 11000 },
      { name: "Koungheul", fee: 10000 },
    ],
  },
  {
    region: "Sédhiou",
    cities: [
      { name: "Sédhiou", fee: 12000 },
      { name: "Bounkiling", fee: 11000 },
      { name: "Goudomp", fee: 13000 },
    ],
  },
  {
    region: "Diourbel",
    cities: [
      { name: "Diourbel", fee: 14000 },
      { name: "Bambey", fee: 13000 },
      { name: "Mbacké / Touba", fee: 14000 },
    ],
  },
  {
    region: "Louga",
    cities: [
      { name: "Louga", fee: 16000 },
      { name: "Linguère", fee: 14000 },
      { name: "Kébémer", fee: 15000 },
    ],
  },
];
