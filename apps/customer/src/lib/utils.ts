import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(paise: number = 0): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];

export const LAUNCH_CATEGORIES = [
  {
    name: 'Jewellery',
    slug: 'jewellery',
    description: 'Dokra brass filigree, terracotta tribal jhumkas, and handcrafted silver ornaments',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80',
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Heritage Kantha stoles, hand-embossed leather totes, and handwoven artisanal apparel',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
  },
  {
    name: 'Home Décor',
    slug: 'home-decor',
    description: 'Hand-thrown clay kulhars, indigo ceramic pottery, and rustic earthen lamps',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80',
  },
  {
    name: 'Gifts',
    slug: 'gifts',
    description: 'Handmade cotton rag journals, artisanal diya hampers, and sustainable craft sets',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
  },
  {
    name: 'Art & Crafts',
    slug: 'art-and-crafts',
    description: 'Authentic Bankura terracotta horses, Dokra metal sculptures, and folk artifacts',
    image: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=600&q=80',
  },
];
