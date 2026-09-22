import { randomBytes } from 'node:crypto';
import {
  AdminRole,
  DiscountType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
  ReviewStatus,
} from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.util';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Demo accounts. Admin passwords are read from the environment so real
// credentials are never committed to the repo; when a variable is unset a
// random password is generated and printed once by this seed run.
// ---------------------------------------------------------------------------
function seedPassword(envVar: string): string {
  const fromEnv = process.env[envVar]?.trim();
  if (fromEnv) return fromEnv;
  const generated = randomBytes(18).toString('base64url');
  console.warn(
    `[seed] ${envVar} not set — generated one-time password: ${generated}`,
  );
  return generated;
}

const ADMINS = [
  {
    id: 'usr-admin-1',
    name: 'Tanvir Haider (Super Admin)',
    email: 'admin@khujigo.com',
    phone: '+880 1711-000111',
    password: seedPassword('SUPER_ADMIN_PASSWORD'),
    role: AdminRole.SUPER_ADMIN,
    avatarUrl: 'https://picsum.photos/seed/admin1/120/120',
  },
  {
    id: 'usr-admin-2',
    name: 'Rahim Chowdhury (Catalog Admin)',
    email: 'manager@khujigo.com',
    phone: '+880 1811-000222',
    password: seedPassword('ADMIN_PASSWORD'),
    role: AdminRole.ADMIN,
    avatarUrl: 'https://picsum.photos/seed/admin2/120/120',
  },
  {
    id: 'usr-admin-3',
    name: 'Sadia Jahan (Orders Staff)',
    email: 'staff@khujigo.com',
    phone: '+880 1911-000333',
    password: seedPassword('STAFF_PASSWORD'),
    role: AdminRole.STAFF,
    avatarUrl: 'https://picsum.photos/seed/admin3/120/120',
  },
];

const CUSTOMERS = [
  {
    id: 'cust-1',
    name: 'Zubair Hossain',
    email: 'customer@khujigo.com',
    phone: '01712345678',
    password: 'customer123',
    division: 'dhaka',
    district: 'dhaka-city',
    area: 'Dhanmondi',
    address: 'House #45, Road #7/A, Dhanmondi R/A, Dhaka',
    createdAt: new Date('2026-02-15T10:30:00Z'),
  },
  {
    id: 'cust-2',
    name: 'Nusrat Farhana',
    email: 'nusrat@gmail.com',
    phone: '01819876543',
    password: 'pass123',
    division: 'chattogram',
    district: 'chattogram',
    area: 'Nasirabad',
    address: 'Flat 4B, Green View Tower, GEC Circle, Chattogram',
    createdAt: new Date('2026-03-01T14:20:00Z'),
  },
  {
    id: 'cust-3',
    name: 'Mahbub Alam',
    email: 'mahbub@gmail.com',
    phone: '01915554433',
    password: 'pass123',
    division: 'sylhet',
    district: 'sylhet',
    area: 'Zindabazar',
    address: 'East Zindabazar, Lane 2, Sylhet',
    createdAt: new Date('2026-03-10T09:15:00Z'),
  },
];

const CATEGORIES: Prisma.CategoryCreateManyInput[] = [
  {
    id: 'cat-gadgets',
    nameEn: 'Gadgets & Tech',
    nameBn: 'গ্যাজেট ও টেকনোলজি',
    slug: 'gadgets',
    descriptionEn:
      'Smart watches, wireless earbuds, charging hubs and innovative daily tech.',
    descriptionBn:
      'স্মার্ট ওয়াচ, ওয়্যারলেস এয়ারবাডস, চার্জিং হাব এবং আধুনিক ডেইলি টেক।',
    imageUrl: 'https://picsum.photos/seed/gadgetscat/400/400',
    icon: 'Watch',
    displayOrder: 1,
  },
  {
    id: 'cat-electronics',
    nameEn: 'Electronics',
    nameBn: 'ইলেকট্রনিক্স',
    slug: 'electronics',
    descriptionEn:
      'Audio systems, mini fans, power banks and high-performance electronics.',
    descriptionBn:
      'অডিও সিস্টেম, রিচার্জেবল মিনি ফ্যান, পাওয়ার ব্যাংক ও দরকারী ইলেকট্রনিক্স।',
    imageUrl: 'https://picsum.photos/seed/electronicscat/400/400',
    icon: 'Cpu',
    displayOrder: 2,
  },
  {
    id: 'cat-home-living',
    nameEn: 'Home & Living',
    nameBn: 'হোম ও লিভিং',
    slug: 'home-living',
    descriptionEn:
      'Smart kitchen utilities, aesthetic lighting, cleaning gadgets and home decor.',
    descriptionBn:
      'স্মার্ট কিচেন আইটেম, নান্দনিক লাইটিং ও ঘর সাজানোর ইউনিক সামগ্রী।',
    imageUrl: 'https://picsum.photos/seed/homecat/400/400',
    icon: 'Home',
    displayOrder: 3,
  },
  {
    id: 'cat-fashion',
    nameEn: 'Fashion & Wear',
    nameBn: 'ফ্যাশন ও লাইফস্টাইল',
    slug: 'fashion',
    descriptionEn:
      'Trending smart backpacks, minimalist wallets, sunglasses and casual apparel.',
    descriptionBn:
      'ট্রেন্ডিং ব্যাকপ্যাক, ওয়াটারপ্রুফ ব্যাগ, সানগ্লাস ও স্মার্ট লাইফস্টাইল অ্যাক্সেসরিজ।',
    imageUrl: 'https://picsum.photos/seed/fashioncat/400/400',
    icon: 'Shirt',
    displayOrder: 4,
  },
  {
    id: 'cat-beauty',
    nameEn: 'Beauty & Personal Care',
    nameBn: 'বিউটি ও পার্সোনাল কেয়ার',
    slug: 'beauty',
    descriptionEn:
      'Grooming kits, sonic facial cleansers, massage devices and skincare tools.',
    descriptionBn: 'গ্রুমিং কিট, ট্রিমার, ম্যাসাজার এবং পার্সোনাল কেয়ার টুলস।',
    imageUrl: 'https://picsum.photos/seed/beautycat/400/400',
    icon: 'Sparkles',
    displayOrder: 5,
  },
  {
    id: 'cat-accessories',
    nameEn: 'Accessories',
    nameBn: 'অ্যাক্সেসরিজ ও অটোমোবাইল',
    slug: 'accessories',
    descriptionEn:
      'Car phone mounts, key organizers, desktop stands and cables.',
    descriptionBn: 'কার মাউন্ট, মোবাইল হোল্ডার, ডেস্ক অর্গানাইজার এবং ক্যাবল।',
    imageUrl: 'https://picsum.photos/seed/accessoriescat/400/400',
    icon: 'Sliders',
    displayOrder: 6,
  },
];

const PRODUCTS: Prisma.ProductCreateManyInput[] = [
  {
    id: 'prod-1',
    nameEn: 'T900 Ultra 2 Smartwatch with Bangla Font & Bluetooth Calling',
    nameBn: 'T900 আল্ট্রা ২ স্মার্টওয়াচ (বাংলা সাপোর্ট ও ব্লুটুথ কলিং)',
    slug: 't900-ultra-2-smartwatch-bangla-support',
    sku: 'KG-WAT-001',
    categoryId: 'cat-gadgets',
    brand: 'KhujiGo Select',
    shortDescEn:
      '2.09-inch HD display, full Bangla Unicode notification support, 45-day standby, wireless charging.',
    shortDescBn:
      '২.০৯ ইঞ্চি ফুল এইচডি ডিসপ্লে, বাংলা নোটিফিকেশন সাপোর্ট, ব্লুটুথ কলিং এবং ওয়্যারলেস চার্জিং সুবিধা।',
    descriptionEn:
      'The ultimate trending smartwatch in Bangladesh. Features crisp IPS display, real-time heart rate and SpO2 tracking, multiple sports modes, Bangla system UI, IP68 water resistance, and premium silicone strap.',
    descriptionBn:
      'বর্তমান বাংলাদেশের সবচেয়ে জনপ্রিয় ও ট্রেন্ডিং স্মার্টওয়াচ! এতে রয়েছে বড় ২.০৯ ইঞ্চি ক্রিস্টাল ক্লিয়ার ডিসপ্লে, সরাসরি বাংলা নোটিফিকেশন পড়ার সুবিধা, ওয়াটারপ্রুফ বডি এবং চমৎকার ব্যাটারি ব্যাকআপ।',
    price: 1450,
    comparePrice: 2200,
    discountPercent: 34,
    stockQuantity: 48,
    lowStockThreshold: 10,
    thumbnailUrl: 'https://picsum.photos/seed/t900watch/600/600',
    galleryUrls: [
      'https://picsum.photos/seed/t900watch/800/800',
      'https://picsum.photos/seed/t900watch2/800/800',
      'https://picsum.photos/seed/t900watch3/800/800',
    ],
    status: ProductStatus.ACTIVE,
    isFeatured: true,
    isTrending: true,
    isBestSeller: true,
    isNewArrival: false,
    rating: 4.8,
    reviewsCount: 128,
    specifications: [
      {
        keyEn: 'Display',
        keyBn: 'ডিসপ্লে',
        valueEn: '2.09" IPS Full Touch HD',
        valueBn: '২.০৯ ইঞ্চি আইপিএস ফুল টাচ',
      },
      {
        keyEn: 'Battery',
        keyBn: 'ব্যাটারি',
        valueEn: '380mAh (3-5 Days usage)',
        valueBn: '৩৮০ মিলিঅ্যাম্পিয়ার (৩-৫ দিন ব্যাকআপ)',
      },
      {
        keyEn: 'Bangla Support',
        keyBn: 'বাংলা সাপোর্ট',
        valueEn: 'Yes (Full Unicode notifications)',
        valueBn: 'হ্যাঁ (বাংলা মেসেজ পড়ার সুবিধা)',
      },
      {
        keyEn: 'Waterproof',
        keyBn: 'ওয়াটারপ্রুফ',
        valueEn: 'IP68 Splash Resistant',
        valueBn: 'আইপি৬৮ স্প্ল্যাশ রেজিস্ট্যান্ট',
      },
      {
        keyEn: 'Warranty',
        keyBn: 'ওয়ারেন্টি',
        valueEn: '7 Days Replacement Guarantee',
        valueBn: '৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি',
      },
    ],
    tags: ['smartwatch', 't900', 'bangla font', 'calling watch', 'trending'],
    seoTitle: 'T900 Ultra 2 Smartwatch Price in Bangladesh | KhujiGo',
    seoDescription:
      'Buy T900 Ultra 2 Smartwatch in BD with Bangla support, Bluetooth calling, and fast Cash on Delivery across Bangladesh.',
    createdAt: new Date('2026-01-10T12:00:00Z'),
  },
  {
    id: 'prod-2',
    nameEn: 'Ultra-Quiet Rechargeable Telescopic Folding Desk & Standing Fan',
    nameBn: 'রিচার্জেবল ফোল্ডিং ফ্যান (হাই স্পিড ও ব্যাকআপ ব্যাটারি)',
    slug: 'rechargeable-telescopic-folding-standing-fan',
    sku: 'KG-FAN-002',
    categoryId: 'cat-electronics',
    brand: 'AirFlow Pro',
    shortDescEn:
      '7200mAh long battery backup (up to 12 hours), 4 speed wind modes, height adjustable from desk to floor.',
    shortDescBn:
      '৭২০০ মিলিঅ্যাম্পিয়ার ব্যাটারি, এক চার্জে ১২ ঘণ্টা পর্যন্ত ব্যাকআপ, ছোট থেকে বড় করার টেলিস্কোপিক সুবিধা।',
    descriptionEn:
      'Essential emergency fan for load-shedding and outdoor travel in Bangladesh. Whisper-quiet brushless motor, 180° oscillation, washable cover, and lightweight foldable body.',
    descriptionBn:
      'লোডশেডিং বা ভ্রমণের জন্য উপযুক্ত ফোল্ডিং রিচার্জেবল ফ্যান। টেবিল ফ্যান ও স্ট্যান্ড ফ্যান উভয় ভাবেই ব্যবহার করা যায়। দীর্ঘ ব্যাটারি ব্যাকআপ ও অত্যন্ত শান্ত মোটর।',
    price: 1890,
    comparePrice: 2600,
    discountPercent: 27,
    stockQuantity: 35,
    lowStockThreshold: 8,
    thumbnailUrl: 'https://picsum.photos/seed/minifan/600/600',
    galleryUrls: [
      'https://picsum.photos/seed/minifan/800/800',
      'https://picsum.photos/seed/minifan2/800/800',
    ],
    status: ProductStatus.ACTIVE,
    isFeatured: true,
    isTrending: true,
    isBestSeller: true,
    isNewArrival: false,
    rating: 4.9,
    reviewsCount: 94,
    specifications: [
      {
        keyEn: 'Battery Capacity',
        keyBn: 'ব্যাটারি ক্যাপাসিটি',
        valueEn: '7200mAh Lithium-ion',
        valueBn: '৭২০০ মিলিঅ্যাম্পিয়ার',
      },
      {
        keyEn: 'Backup Time',
        keyBn: 'ব্যাকআপ টাইম',
        valueEn: '6 to 14 Hours depending on speed',
        valueBn: '৬ থেকে ১৪ ঘণ্টা',
      },
      {
        keyEn: 'Charging Port',
        keyBn: 'চার্জিং পোর্ট',
        valueEn: 'Type-C Fast Charging',
        valueBn: 'টাইপ-সি ফাস্ট চার্জিং',
      },
      {
        keyEn: 'Adjustable Height',
        keyBn: 'উচ্চতা অ্যাডজাস্ট',
        valueEn: '36cm to 100cm',
        valueBn: '৩৬ সেমি থেকে ১০০ সেমি পর্যন্ত',
      },
    ],
    tags: ['fan', 'rechargeable fan', 'emergency fan', 'summer deals'],
    seoTitle: 'Rechargeable Folding Fan Price in BD | KhujiGo',
    seoDescription:
      'Best portable rechargeable fan in Bangladesh with 7200mAh battery. Cash on delivery available.',
    createdAt: new Date('2026-01-14T10:00:00Z'),
  },
  {
    id: 'prod-3',
    nameEn: 'Transparent ANC Wireless Earbuds with Dual Mic & ENC',
    nameBn:
      'ট্রান্সপারেন্ট স্টাইলিশ ওয়্যারলেস এয়ারবাডস (অ্যাক্টিভ নয়েজ ক্যান্সেলেশন)',
    slug: 'transparent-anc-wireless-earbuds-dual-mic',
    sku: 'KG-AUD-003',
    categoryId: 'cat-gadgets',
    brand: 'SonicWave',
    shortDescEn:
      'Futuristic clear casing, 32dB active noise cancellation, deep bass boost, 30 hours total playback.',
    shortDescBn:
      'আধুনিক ট্রান্সপারেন্ট ডিজাইন, ডিপ বেস সাউন্ড, অ্যাক্টিভ নয়েজ ক্যান্সেলেশন ও ৩০ ঘণ্টা প্লেব্যাক।',
    descriptionEn:
      'Stand out from the crowd with cyber-aesthetic transparent earbuds. Featuring Bluetooth 5.4 for zero latency gaming, dual ENC microphones for crystal clear phone calls even in noisy Dhaka traffic.',
    descriptionBn:
      'আকর্ষণীয় ট্রান্সপারেন্ট লুক এবং প্রিমিয়াম সাউন্ড কোয়ালিটির নতুন ওয়্যারলেস ব্লুটুথ হেডফোন। জিরো ল্যাগ গেমিং ও বাইরের কোলাহল মুক্ত স্পষ্ট কলিং এক্সপেরিয়েন্স।',
    price: 1250,
    comparePrice: 1850,
    discountPercent: 32,
    stockQuantity: 62,
    lowStockThreshold: 12,
    thumbnailUrl: 'https://picsum.photos/seed/earbudsglass/600/600',
    galleryUrls: [
      'https://picsum.photos/seed/earbudsglass/800/800',
      'https://picsum.photos/seed/earbudsglass2/800/800',
    ],
    status: ProductStatus.ACTIVE,
    isFeatured: false,
    isTrending: true,
    isBestSeller: false,
    isNewArrival: true,
    rating: 4.7,
    reviewsCount: 76,
    specifications: [
      {
        keyEn: 'Bluetooth',
        keyBn: 'ব্লুটুথ ভার্সন',
        valueEn: 'V5.4 Low Latency',
        valueBn: 'ভার্সন ৫.৪',
      },
      {
        keyEn: 'Playtime',
        keyBn: 'প্লেব্যাক টাইম',
        valueEn: '6 Hours (Earbuds) + 24 Hours (Case)',
        valueBn: '৬ ঘণ্টা + ২৪ ঘণ্টা (কেস সহ)',
      },
      {
        keyEn: 'Noise Cancellation',
        keyBn: 'নয়েজ ক্যান্সেলেশন',
        valueEn: 'ENC Dual Mic Call Clarity',
        valueBn: 'ইএনসি ডুয়েল মাইক',
      },
    ],
    tags: ['earbuds', 'wireless earbuds', 'transparent earbuds', 'audio', 'anc'],
    seoTitle:
      'Transparent ANC Wireless Earbuds Price in Bangladesh | KhujiGo',
    seoDescription:
      'Buy trendsetting transparent wireless earbuds in Bangladesh at the lowest price on KhujiGo.',
    createdAt: new Date('2026-02-01T08:00:00Z'),
  },
  {
    id: 'prod-4',
    nameEn: 'Electric Portable Heating Lunch Box with Stainless Steel Tray',
    nameBn: 'ইলেকট্রিক পোর্টেবল হিটিং লাঞ্চ বক্স (অফিস ও ভ্রমণের জন্য)',
    slug: 'electric-portable-heating-lunch-box',
    sku: 'KG-HOM-004',
    categoryId: 'cat-home-living',
    brand: 'MealWarm',
    shortDescEn:
      'Plug and warm hot food in 15 minutes, food grade 304 stainless steel, leakproof seal, spoon included.',
    shortDescBn:
      'মাত্র ১৫ মিনিটে গরম খাবার প্রস্তুত! ফুড গ্রেড স্টেইনলেস স্টিল ও ১০০% লিকপ্রুফ ডিজাইন।',
    descriptionEn:
      'Never eat cold office lunch again! Simply plug it in 15 minutes before mealtime. Uses energy-efficient PTC heating technology to maintain nutrition and taste without burning food.',
    descriptionBn:
      'অফিস বা কর্মক্ষেত্রে গরম ও স্বাস্থ্যকর ঘরোয়া খাবার খাওয়ার সেরা সমাধান। বিদ্যুৎ সাশ্রয়ী পিটিসি হিটিং সিস্টেম খাবার রাখে গরম ও সুস্বাদু।',
    price: 1190,
    comparePrice: 1650,
    discountPercent: 28,
    stockQuantity: 24,
    lowStockThreshold: 5,
    thumbnailUrl: 'https://picsum.photos/seed/lunchboxheat/600/600',
    galleryUrls: [
      'https://picsum.photos/seed/lunchboxheat/800/800',
      'https://picsum.photos/seed/lunchboxheat2/800/800',
    ],
    status: ProductStatus.ACTIVE,
    isFeatured: false,
    isTrending: true,
    isBestSeller: false,
    isNewArrival: false,
    rating: 4.6,
    reviewsCount: 51,
    specifications: [
      {
        keyEn: 'Material',
        keyBn: 'উপাদান',
        valueEn: 'SUS 304 Food Grade Steel',
        valueBn: 'ফুড গ্রেড ৩০৪ স্টিল',
      },
      {
        keyEn: 'Power',
        keyBn: 'পাওয়ার',
        valueEn: '40W Energy Saver',
        valueBn: '৪০ ওয়াট',
      },
      {
        keyEn: 'Capacity',
        keyBn: 'ধারণক্ষমতা',
        valueEn: '1.5 Liters',
        valueBn: '১.৫ লিটার',
      },
    ],
    tags: ['lunch box', 'heating lunch box', 'office utility', 'kitchen gadget'],
    seoTitle: 'Electric Heating Lunch Box BD Price | KhujiGo',
    seoDescription:
      'Warm up your meals anywhere with the electric heating lunch box. Order online on KhujiGo BD.',
    createdAt: new Date('2026-02-05T09:00:00Z'),
  },
  {
    id: 'prod-5',
    nameEn:
      'Foldable Silicone Travel Electric Kettle 600ml with Boil-Dry Protection',
    nameBn: 'ফোল্ডিং ট্রাভেল ইলেকট্রিক কেটলি (৬০০ মিলি ফুড-গ্রেড সিলিকন)',
    slug: 'foldable-silicone-travel-electric-kettle',
    sku: 'KG-HOM-005',
    categoryId: 'cat-home-living',
    brand: 'KhujiGo Home',
    shortDescEn:
      'Folds flat to fit in your backpack! Fast boiling in 3 minutes, automatic shut-off, dual voltage.',
    shortDescBn:
      'ভ্রমণের জন্য ভাঁজ করে ব্যাগে রাখা যায়। মাত্র ৩ মিনিটে দ্রুত পানি ফুটানো এবং অটো শাট-অফ সুবিধা।',
    descriptionEn:
      'The must-have gadget for travelers, university hostels, and office desks. Made of baby-grade platinum silicone and 304 stainless steel base. Boils water in just 3-4 minutes safely.',
    descriptionBn:
      'ভ্রমণপ্রেমী বা হোস্টেল ছাত্রদের জন্য একটি দরকারি গ্যাজেট। সহজে ছোট করে ব্যাগে বহন করা যায় এবং চোখের পলকে গরম পানি, চা ও কফি তৈরি করে।',
    price: 990,
    comparePrice: 1500,
    discountPercent: 34,
    stockQuantity: 40,
    lowStockThreshold: 8,
    thumbnailUrl: 'https://picsum.photos/seed/foldkettle/600/600',
    galleryUrls: [
      'https://picsum.photos/seed/foldkettle/800/800',
      'https://picsum.photos/seed/foldkettle2/800/800',
    ],
    status: ProductStatus.ACTIVE,
    isFeatured: true,
    isTrending: true,
    isBestSeller: true,
    isNewArrival: false,
    rating: 4.9,
    reviewsCount: 83,
    specifications: [
      {
        keyEn: 'Capacity',
        keyBn: 'ধারণক্ষমতা',
        valueEn: '600 ml',
        valueBn: '৬০০ মিলিলিটার',
      },
      {
        keyEn: 'Boil Time',
        keyBn: 'ফুটানোর সময়',
        valueEn: '3-4 Minutes',
        valueBn: '৩-৪ মিনিট',
      },
      {
        keyEn: 'Material',
        keyBn: 'উপাদান',
        valueEn: 'Baby-safe Food Grade Silicone',
        valueBn: 'ফুড গ্রেড সেফ সিলিকন',
      },
    ],
    tags: ['kettle', 'electric kettle', 'travel kettle', 'foldable gadget'],
    seoTitle: 'Foldable Travel Electric Kettle Price in Bangladesh | KhujiGo',
    seoDescription:
      'Collapsible portable travel electric kettle with auto shut off. Low price in BD on KhujiGo.',
    createdAt: new Date('2026-02-12T11:00:00Z'),
  },
  {
    id: 'prod-6',
    nameEn: 'Waterproof Anti-Theft Laptop Backpack with USB Charging Port',
    nameBn: 'ওয়াটারপ্রুফ অ্যান্টি-থেফট ল্যাপটপ ব্যাকপ্যাক (ইউএসবি পোর্ট সহ)',
    slug: 'waterproof-anti-theft-laptop-backpack-usb',
    sku: 'KG-FAS-006',
    categoryId: 'cat-fashion',
    brand: 'Vanguard BD',
    shortDescEn:
      'Fits up to 15.6" laptop, hidden lockable zippers, water-repellent oxford fabric, luggage strap.',
    shortDescBn:
      '১৫.৬ ইঞ্চি ল্যাপটপ কম্পার্টমেন্ট, লুকানো অ্যান্টি-থেফট চেইন, ওয়াটার-প্রতিরোধী ও টেকসই মেটেরিয়াল।',
    descriptionEn:
      'Engineered for daily Dhaka commuters and university students. Keeps your expensive gadgets completely dry during monsoon rains and safe from pickpockets with concealed zip geometry.',
    descriptionBn:
      'বৃষ্টির দিনে গ্যাজেট সুরক্ষিত রাখতে প্রিমিয়াম ওয়াটারপ্রুফ ফ্যাব্রিক ব্যাকপ্যাক। এতে আছে বিল্ট-ইন ইউএসবি চার্জিং পোর্ট এবং চোর-প্রতিরোধী গোপন পকেট।',
    price: 1650,
    comparePrice: 2400,
    discountPercent: 31,
    stockQuantity: 19,
    lowStockThreshold: 4,
    thumbnailUrl: 'https://picsum.photos/seed/laptopbag/600/600',
    galleryUrls: [
      'https://picsum.photos/seed/laptopbag/800/800',
      'https://picsum.photos/seed/laptopbag2/800/800',
    ],
    status: ProductStatus.ACTIVE,
    isFeatured: false,
    isTrending: false,
    isBestSeller: true,
    isNewArrival: false,
    rating: 4.8,
    reviewsCount: 67,
    specifications: [
      {
        keyEn: 'Laptop Size',
        keyBn: 'ল্যাপটপ সাইজ',
        valueEn: 'Up to 15.6 Inches',
        valueBn: '১৫.৬ ইঞ্চি পর্যন্ত',
      },
      {
        keyEn: 'Fabric',
        keyBn: 'ফ্যাব্রিক',
        valueEn: 'High-Density 900D Waterproof Oxford',
        valueBn: 'হাই ডেনসিটি ওয়াটারপ্রুফ অক্সফোর্ড',
      },
      {
        keyEn: 'USB Port',
        keyBn: 'ইউএসবি পোর্ট',
        valueEn: 'External charging pass-through',
        valueBn: 'এক্সটার্নাল চার্জিং সুবিধা',
      },
    ],
    tags: ['backpack', 'laptop bag', 'anti theft bag', 'fashion bd'],
    seoTitle: 'Anti Theft Laptop Backpack in BD | KhujiGo',
    seoDescription:
      'Best waterproof laptop backpack with USB port in Bangladesh. Authentic quality guaranteed.',
    createdAt: new Date('2026-02-18T13:00:00Z'),
  },
  {
    id: 'prod-7',
    nameEn: '360° Magnetic Wireless Car Charger & Dashboard Phone Mount',
    nameBn: '৩৬০° ম্যাগনেটিক কার ফোন মাউন্ট ও ফাস্ট ওয়্যারলেস চার্জার',
    slug: '360-magnetic-wireless-car-charger-mount',
    sku: 'KG-ACC-007',
    categoryId: 'cat-accessories',
    brand: 'MagDrive',
    shortDescEn:
      'Strong N52 neodymium magnets, 15W Qi wireless fast charge, one-hand release, dashboard & AC vent dual base.',
    shortDescBn:
      'শক্তিশালী ম্যাগনেট গ্রিপ, ১৫ ওয়াট ফাস্ট ওয়্যারলেস চার্জিং, এক হাতে ব্যবহারের সুবিধা ও ৩৬০ ডিগ্রি রোটেশন।',
    descriptionEn:
      'Keep your smartphone rock-solid while navigating roads in Bangladesh. Holds even during sudden bumps and automatically charges your phone at peak wireless speeds.',
    descriptionBn:
      'গাড়িতে নিরাপদ ফোন ব্যবহারের জন্য শক্তিশালী ম্যাগনেটিক হোল্ডার। ঝাঁকুনিতেও ফোন পড়ে যাবে না এবং স্বয়ংক্রিয়ভাবে দ্রুত চার্জ সম্পন্ন হবে।',
    price: 850,
    comparePrice: 1300,
    discountPercent: 35,
    stockQuantity: 55,
    lowStockThreshold: 10,
    thumbnailUrl: 'https://picsum.photos/seed/carmount/600/600',
    galleryUrls: [
      'https://picsum.photos/seed/carmount/800/800',
      'https://picsum.photos/seed/carmount2/800/800',
    ],
    status: ProductStatus.ACTIVE,
    isFeatured: false,
    isTrending: true,
    isBestSeller: false,
    isNewArrival: true,
    rating: 4.7,
    reviewsCount: 42,
    specifications: [
      {
        keyEn: 'Wireless Output',
        keyBn: 'ওয়্যারলেস আউটপুট',
        valueEn: '15W / 10W / 7.5W Fast Charging',
        valueBn: '১৫ ওয়াট ফাস্ট চার্জিং',
      },
      {
        keyEn: 'Mount Type',
        keyBn: 'মাউন্ট টাইপ',
        valueEn: 'Air Vent + Suction Dashboard',
        valueBn: 'এয়ার ভেন্ট ও ড্যাশবোর্ড',
      },
    ],
    tags: ['car mount', 'wireless charger', 'accessories', 'magsafe'],
    seoTitle: 'Magnetic Car Phone Mount & Wireless Charger BD | KhujiGo',
    seoDescription:
      'Order 360 degree magnetic car mount with 15W wireless charging in Bangladesh.',
    createdAt: new Date('2026-02-25T15:00:00Z'),
  },
  {
    id: 'prod-8',
    nameEn:
      'Ergonomic Memory Foam Lumbar Support Cushion for Chair & Car',
    nameBn: 'মেমরি ফোম অর্থোপেডিক ব্যাক সাপোর্ট কুশন (কোমর ব্যথার উপশম)',
    slug: 'ergonomic-memory-foam-lumbar-support-cushion',
    sku: 'KG-HOM-008',
    categoryId: 'cat-home-living',
    brand: 'OrthoRelief',
    shortDescEn:
      'High-density memory foam, relieves back pain and corrects sitting posture, breathable 3D mesh cover.',
    shortDescBn:
      'প্রিমিয়াম মেমরি ফোম, দীর্ঘক্ষণ বসে কাজ করার কোমর ও পিঠের ব্যথা উপশম করে, ধৌতযোগ্য মেশ কভার।',
    descriptionEn:
      'Ideal for office workers, programmers, and drivers suffering from sedentary posture fatigue. Ergonomically contoured to maintain natural spine curvature throughout the day.',
    descriptionBn:
      'অফিসে দীর্ঘক্ষণ কাজ করা ব্যক্তি বা গাড়ি চালকদের জন্য আরামদায়ক ব্যাক সাপোর্ট কুশন। ব্যাকপেইন কমায় ও সঠিক শারীরিক গঠন বজায় রাখে।',
    price: 1350,
    comparePrice: 1950,
    discountPercent: 31,
    stockQuantity: 28,
    lowStockThreshold: 6,
    thumbnailUrl: 'https://picsum.photos/seed/backsupport/600/600',
    galleryUrls: [
      'https://picsum.photos/seed/backsupport/800/800',
      'https://picsum.photos/seed/backsupport2/800/800',
    ],
    status: ProductStatus.ACTIVE,
    isFeatured: true,
    isTrending: true,
    isBestSeller: false,
    isNewArrival: false,
    rating: 4.9,
    reviewsCount: 59,
    specifications: [
      {
        keyEn: 'Core Material',
        keyBn: 'ফোম উপাদান',
        valueEn: '100% Space-Grade Memory Foam',
        valueBn: '১০০% পিওর মেমরি ফোম',
      },
      {
        keyEn: 'Cover',
        keyBn: 'কভার',
        valueEn: 'Removable, Washable Breathable Mesh',
        valueBn: 'ওয়াশেবল এয়ার মেশ কভার',
      },
    ],
    tags: ['back support', 'memory foam', 'orthopedic', 'office chair'],
    seoTitle: 'Memory Foam Lumbar Support Cushion in BD | KhujiGo',
    seoDescription:
      'Relieve back pain with genuine orthopedic memory foam back support. Buy online on KhujiGo BD.',
    createdAt: new Date('2026-03-01T10:00:00Z'),
  },
];

const COUPONS: Prisma.CouponCreateManyInput[] = [
  {
    id: 'coup-1',
    code: 'KHUJIGO100',
    discountType: DiscountType.FIXED,
    discountValue: 100,
    minOrderAmount: 1000,
    usageLimit: 500,
    usedCount: 87,
    startDate: new Date('2026-01-01T00:00:00Z'),
    expiryDate: new Date('2026-12-31T23:59:59Z'),
    isActive: true,
  },
  {
    id: 'coup-2',
    code: 'EID2026',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minOrderAmount: 1500,
    maxDiscountAmount: 300,
    usageLimit: 1000,
    usedCount: 142,
    startDate: new Date('2026-03-01T00:00:00Z'),
    expiryDate: new Date('2026-04-30T23:59:59Z'),
    isActive: true,
  },
  {
    id: 'coup-3',
    code: 'TRENDING50',
    discountType: DiscountType.FIXED,
    discountValue: 50,
    minOrderAmount: 500,
    usageLimit: 2000,
    usedCount: 310,
    startDate: new Date('2026-01-01T00:00:00Z'),
    expiryDate: new Date('2026-12-31T23:59:59Z'),
    isActive: true,
  },
];

const BANNERS: Prisma.BannerCreateManyInput[] = [
  {
    id: 'ban-1',
    titleEn: 'Discover Trending Smart Gadgets in Bangladesh',
    titleBn: 'খুঁজে নিন বাংলাদেশের ট্রেন্ডিং গ্যাজেট ও লাইফস্টাইল পণ্য!',
    subtitleEn:
      'Top trending, unique & useful daily items delivered right to your doorstep.',
    subtitleBn:
      'ইউনিক ও দরকারি সব ট্রেন্ডিং প্রোডাক্ট পাচ্ছেন সবচেয়ে আকর্ষণীয় ডিসকাউন্টে।',
    buttonTextEn: 'Shop Now',
    buttonTextBn: 'এখনই শপিং করুন',
    buttonUrl: '/shop?filter=trending',
    imageUrl: 'https://picsum.photos/seed/khujigobanner1/1200/500',
    badgeEn: 'Mega Trending Offer',
    badgeBn: 'ট্রেন্ডিং ধামাকা অফার',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'ban-2',
    titleEn: 'Smart Living & Everyday Essentials',
    titleBn: 'স্মার্ট কিচেন ও হোম ইউটিলিটি গ্যাজেট কালেকশন',
    subtitleEn:
      'Save up to 40% OFF on premium household solutions with Cash on Delivery.',
    subtitleBn:
      'দৈনন্দিন জীবন সহজ করতে স্মার্ট হোম অ্যাপ্লায়েন্সে ৪০% পর্যন্ত বিশেষ ছাড়!',
    buttonTextEn: 'Explore Collection',
    buttonTextBn: 'কালেকশন দেখুন',
    buttonUrl: '/categories/home-living',
    imageUrl: 'https://picsum.photos/seed/khujigobanner2/1200/500',
    badgeEn: 'Up to 40% OFF',
    badgeBn: '৪০% পর্যন্ত ছাড়',
    displayOrder: 2,
    isActive: true,
  },
];

const REVIEWS: Prisma.ReviewCreateManyInput[] = [
  {
    id: 'rev-1',
    productId: 'prod-1',
    productName: 'T900 Ultra 2 Smartwatch',
    customerName: 'সাকিব আল হাসান',
    rating: 5,
    comment:
      'ঘড়িটা অসাধারণ! বাংলায় এসএমএস পড়তে কোনো সমস্যা হয় না। ব্যাটারি ব্যাকআপ ৪ দিন পেয়েছি। KhujiGo কে ধন্যবাদ দ্রুত ডেলিভারির জন্য!',
    status: ReviewStatus.APPROVED,
    createdAt: new Date('2026-03-12T16:00:00Z'),
  },
  {
    id: 'rev-2',
    productId: 'prod-1',
    productName: 'T900 Ultra 2 Smartwatch',
    customerName: 'Ariful Islam',
    rating: 5,
    comment:
      'Product quality is 100% original as advertised. Calling clarity is great. Inside Dhaka delivered in 24 hours.',
    status: ReviewStatus.APPROVED,
    createdAt: new Date('2026-03-15T12:30:00Z'),
  },
  {
    id: 'rev-3',
    productId: 'prod-2',
    productName: 'Rechargeable Folding Fan',
    customerName: 'ফারজানা ইয়াসমিন',
    rating: 5,
    comment:
      'লোডশেডিং এর সময়ে একদম লাইফ সেভার! ফ্যানটার বাতাস অনেক ভালো এবং আওয়াজ একদমই নেই।',
    status: ReviewStatus.APPROVED,
    createdAt: new Date('2026-03-16T18:20:00Z'),
  },
  {
    id: 'rev-4',
    productId: 'prod-5',
    productName: 'Foldable Silicone Kettle',
    customerName: 'Kamrul Hasan',
    rating: 4,
    comment:
      'Very practical for office tea and instant noodles. Folds nicely inside backpack.',
    status: ReviewStatus.APPROVED,
    createdAt: new Date('2026-03-18T10:15:00Z'),
  },
];

interface SeedOrder {
  id: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  division: string;
  district: string;
  area: string;
  fullAddress: string;
  deliveryNotes: string | null;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  couponCode: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  items: Prisma.OrderItemCreateManyInput[];
}

const ORDERS: SeedOrder[] = [
  {
    id: 'KG-2026-8941',
    customerId: 'cust-1',
    customerName: 'Zubair Hossain',
    customerPhone: '01712345678',
    customerEmail: 'customer@khujigo.com',
    division: 'dhaka',
    district: 'dhaka-city',
    area: 'Dhanmondi',
    fullAddress: 'House #45, Road #7/A, Dhanmondi R/A, Dhaka',
    deliveryNotes: 'Please call before delivery',
    subtotal: 2300,
    deliveryCharge: 60,
    discount: 100,
    couponCode: 'KHUJIGO100',
    totalAmount: 2260,
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.UNPAID,
    orderStatus: OrderStatus.CONFIRMED,
    createdAt: new Date('2026-03-20T14:32:00Z'),
    updatedAt: new Date('2026-03-20T16:00:00Z'),
    items: [
      {
        orderId: 'KG-2026-8941',
        productId: 'prod-1',
        nameEn:
          'T900 Ultra 2 Smartwatch with Bangla Font & Bluetooth Calling',
        nameBn: 'T900 আল্ট্রা ২ স্মার্টওয়াচ (বাংলা সাপোর্ট ও ব্লুটুথ কলিং)',
        thumbnailUrl: 'https://picsum.photos/seed/t900watch/600/600',
        price: 1450,
        quantity: 1,
        total: 1450,
      },
      {
        orderId: 'KG-2026-8941',
        productId: 'prod-7',
        nameEn: '360° Magnetic Wireless Car Charger & Dashboard Phone Mount',
        nameBn: '৩৬০° ম্যাগনেটিক কার ফোন মাউন্ট ও ফাস্ট ওয়্যারলেস চার্জার',
        thumbnailUrl: 'https://picsum.photos/seed/carmount/600/600',
        price: 850,
        quantity: 1,
        total: 850,
      },
    ],
  },
  {
    id: 'KG-2026-8940',
    customerId: 'cust-2',
    customerName: 'Nusrat Farhana',
    customerPhone: '01819876543',
    customerEmail: 'nusrat@gmail.com',
    division: 'chattogram',
    district: 'chattogram',
    area: 'Nasirabad',
    fullAddress: 'Flat 4B, Green View Tower, GEC Circle, Chattogram',
    deliveryNotes: null,
    subtotal: 3780,
    deliveryCharge: 0,
    discount: 0,
    couponCode: null,
    totalAmount: 3780,
    paymentMethod: PaymentMethod.BKASH,
    paymentStatus: PaymentStatus.PAID,
    orderStatus: OrderStatus.SHIPPED,
    createdAt: new Date('2026-03-19T11:15:00Z'),
    updatedAt: new Date('2026-03-20T10:00:00Z'),
    items: [
      {
        orderId: 'KG-2026-8940',
        productId: 'prod-2',
        nameEn:
          'Ultra-Quiet Rechargeable Telescopic Folding Desk & Standing Fan',
        nameBn: 'রিচার্জেবল ফোল্ডিং ফ্যান (হাই স্পিড ও ব্যাকআপ ব্যাটারি)',
        thumbnailUrl: 'https://picsum.photos/seed/minifan/600/600',
        price: 1890,
        quantity: 2,
        total: 3780,
      },
    ],
  },
  {
    id: 'KG-2026-8939',
    customerId: 'cust-3',
    customerName: 'Mahbub Alam',
    customerPhone: '01915554433',
    customerEmail: 'mahbub@gmail.com',
    division: 'sylhet',
    district: 'sylhet',
    area: 'Zindabazar',
    fullAddress: 'East Zindabazar, Lane 2, Sylhet',
    deliveryNotes: null,
    subtotal: 990,
    deliveryCharge: 120,
    discount: 0,
    couponCode: null,
    totalAmount: 1110,
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.PAID,
    orderStatus: OrderStatus.DELIVERED,
    createdAt: new Date('2026-03-16T09:20:00Z'),
    updatedAt: new Date('2026-03-18T15:40:00Z'),
    items: [
      {
        orderId: 'KG-2026-8939',
        productId: 'prod-5',
        nameEn: 'Foldable Silicone Travel Electric Kettle 600ml',
        nameBn: 'ফোল্ডিং ট্রাভেল ইলেকট্রিক কেটলি',
        thumbnailUrl: 'https://picsum.photos/seed/foldkettle/600/600',
        price: 990,
        quantity: 1,
        total: 990,
      },
    ],
  },
  {
    id: 'KG-2026-8938',
    customerId: null,
    customerName: 'Tanvir Hossain',
    customerPhone: '01678889900',
    customerEmail: null,
    division: 'rajshahi',
    district: 'bogra',
    area: 'Shatmatha',
    fullAddress: 'Near Town Hall, Shatmatha, Bogura',
    deliveryNotes: null,
    subtotal: 1250,
    deliveryCharge: 120,
    discount: 0,
    couponCode: null,
    totalAmount: 1370,
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.UNPAID,
    orderStatus: OrderStatus.PENDING,
    createdAt: new Date('2026-03-21T07:45:00Z'),
    updatedAt: new Date('2026-03-21T07:45:00Z'),
    items: [
      {
        orderId: 'KG-2026-8938',
        productId: 'prod-3',
        nameEn: 'Transparent ANC Wireless Earbuds',
        nameBn: 'ট্রান্সপারেন্ট স্টাইলিশ ওয়্যারলেস এয়ারবাডস',
        thumbnailUrl: 'https://picsum.photos/seed/earbudsglass/600/600',
        price: 1250,
        quantity: 1,
        total: 1250,
      },
    ],
  },
];

async function seed(): Promise<void> {
  // Idempotent: clear child rows first so the script can be re-run safely.
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.promoSection.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.deliverySettings.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.admin.deleteMany();

  await prisma.admin.createMany({
    data: await Promise.all(
      ADMINS.map(async ({ password, ...admin }) => ({
        ...admin,
        passwordHash: await hashPassword(password),
      })),
    ),
  });

  await prisma.customer.createMany({
    data: await Promise.all(
      CUSTOMERS.map(async ({ password, ...customer }) => ({
        ...customer,
        passwordHash: await hashPassword(password),
      })),
    ),
  });

  await prisma.category.createMany({ data: CATEGORIES });
  await prisma.product.createMany({ data: PRODUCTS });
  await prisma.coupon.createMany({ data: COUPONS });
  await prisma.banner.createMany({ data: BANNERS });
  await prisma.review.createMany({ data: REVIEWS });

  await prisma.deliverySettings.create({
    data: {
      id: 'default',
      insideDhaka: 60,
      outsideDhaka: 120,
      freeDeliveryThreshold: 2500,
      estimatedDaysInsideDhaka: '১-২ দিন (ঢাকা)',
      estimatedDaysOutsideDhaka: '২-৪ দিন (সারাদেশ)',
    },
  });

  await prisma.promoSection.create({
    data: {
      id: 'default',
      isActive: true,
      couponId: 'coup-1',
    },
  });

  for (const { items, ...order } of ORDERS) {
    await prisma.order.create({
      data: {
        ...order,
        items: { create: items.map(({ orderId: _orderId, ...item }) => item) },
      },
    });
  }

  const counts = {
    admins: await prisma.admin.count(),
    customers: await prisma.customer.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    coupons: await prisma.coupon.count(),
    reviews: await prisma.review.count(),
    banners: await prisma.banner.count(),
  };

  console.log('Seed complete:', counts);
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
