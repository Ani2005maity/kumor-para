import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import {
  User,
  Seller,
  Category,
  Product,
  Order,
  SellerOrder,
  Payment,
  Invoice,
  InvoiceCounter,
  Review,
  Settings,
  AuditLog,
} from './models/index.js';

dotenv.config();

export async function seedDatabase(shouldDisconnect: boolean = false) {
  console.log('🌱 Starting Kumor Para database seeding...');
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  // Clear existing collections
  console.log('🧹 Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Seller.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    SellerOrder.deleteMany({}),
    Payment.deleteMany({}),
    Invoice.deleteMany({}),
    InvoiceCounter.deleteMany({}),
    Review.deleteMany({}),
    Settings.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const BCRYPT_SALT_ROUNDS = 12;

  // 1. Create Platform Settings
  console.log('⚙️  Creating platform settings...');
  const settings = await Settings.create({
    platformCommissionRate: 10,
    invoiceTrigger: 'payment_confirmed',
    financialYear: '2026-27',
    enableTotp2FA: false,
    tcsRate: 1, // 1% TCS
    tdsRate: 0.1, // 0.1% TDS under 194-O
  });

  // 2. Create Categories
  console.log('📦 Creating launch categories...');
  const categoriesData = [
    {
      name: 'Jewellery',
      slug: 'jewellery',
      iconKey: 'sparkles',
      defaultCommissionRate: 12,
      hsnCode: '7117',
      gstRate: 3,
      isActive: true,
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      iconKey: 'shirt',
      defaultCommissionRate: 10,
      hsnCode: '6204',
      gstRate: 5,
      isActive: true,
    },
    {
      name: 'Home Décor',
      slug: 'home-decor',
      iconKey: 'home',
      defaultCommissionRate: 10,
      hsnCode: '6912',
      gstRate: 12,
      isActive: true,
    },
    {
      name: 'Gifts',
      slug: 'gifts',
      iconKey: 'gift',
      defaultCommissionRate: 8,
      hsnCode: '4820',
      gstRate: 12,
      isActive: true,
    },
    {
      name: 'Art & Crafts',
      slug: 'art-and-crafts',
      iconKey: 'palette',
      defaultCommissionRate: 10,
      hsnCode: '9701',
      gstRate: 12,
      isActive: true,
    },
  ];

  const categories = await Category.insertMany(categoriesData);
  const categoryMap = new Map(categories.map((c) => [c.slug, c]));

  // 3. Create Users (1 Admin, 2 Sellers, 3 Customers)
  console.log('👤 Creating users with bcrypt (cost 12)...');
  const defaultPassword = 'Password@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, BCRYPT_SALT_ROUNDS);

  // 3.1 Admin
  const adminUser = await User.create({
    name: 'Kumor Para Administrator',
    email: 'admin@kumorpara.com',
    passwordHash: hashedPassword,
    phone: '+919876543210',
    role: 'admin',
    emailVerified: true,
    phoneVerified: true,
    isAccountActive: true,
    isDemoAccount: true,
    addresses: [],
  });

  // 3.2 Seller 1 User (Mrittika Studio)
  const seller1User = await User.create({
    name: 'Debjani Mukherjee',
    email: 'debjani@mrittika.com',
    passwordHash: hashedPassword,
    phone: '+919830012345',
    role: 'seller',
    emailVerified: true,
    phoneVerified: true,
    isAccountActive: true,
    isDemoAccount: true,
    addresses: [
      {
        name: 'Mrittika Studio Workshop',
        phone: '+919830012345',
        street: '14/2 Kumartuli Ghat Road',
        landmark: 'Near Kumartuli Park',
        city: 'Kolkata',
        state: 'West Bengal',
        stateCode: '19',
        pincode: '700005',
        isDefault: true,
      },
    ],
  });

  // 3.3 Seller 2 User (Shantiniketan Leather Crafts)
  const seller2User = await User.create({
    name: 'Biren Mondal',
    email: 'biren@shantiniketanleather.com',
    passwordHash: hashedPassword,
    phone: '+919434056789',
    role: 'seller',
    emailVerified: true,
    phoneVerified: true,
    isAccountActive: true,
    isDemoAccount: true,
    addresses: [
      {
        name: 'Shantiniketan Leather Works',
        phone: '+919434056789',
        street: 'Sonajhuri Haat Road, Ratan Pally',
        landmark: 'Opposite Amar Kutir',
        city: 'Bolpur',
        state: 'West Bengal',
        stateCode: '19',
        pincode: '731235',
        isDefault: true,
      },
    ],
  });

  // 3.4 Customers (with addresses in different Indian States for GST testing)
  const customer1 = await User.create({
    name: 'Ananya Sen',
    email: 'ananya@example.com',
    passwordHash: hashedPassword,
    phone: '+919831122334',
    role: 'customer',
    emailVerified: true,
    phoneVerified: true,
    isAccountActive: true,
    isDemoAccount: true,
    addresses: [
      {
        name: 'Ananya Sen (Home)',
        phone: '+919831122334',
        street: 'Flat 4B, Greenfield Heights, New Town Action Area 1',
        landmark: 'Near Axis Mall',
        city: 'Kolkata',
        state: 'West Bengal',
        stateCode: '19',
        pincode: '700156',
        isDefault: true,
      },
    ],
  });

  const customer2 = await User.create({
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    passwordHash: hashedPassword,
    phone: '+919820033445',
    role: 'customer',
    emailVerified: true,
    phoneVerified: true,
    isAccountActive: true,
    isDemoAccount: true,
    addresses: [
      {
        name: 'Rahul Sharma (Residence)',
        phone: '+919820033445',
        street: '1202 Sea Breeze Apartments, Bandra West',
        landmark: 'Near Carter Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        stateCode: '27',
        pincode: '400050',
        isDefault: true,
      },
    ],
  });

  const customer3 = await User.create({
    name: 'Priya Patel',
    email: 'priya@example.com',
    passwordHash: hashedPassword,
    phone: '+919898044556',
    role: 'customer',
    emailVerified: true,
    phoneVerified: true,
    isAccountActive: true,
    isDemoAccount: true,
    addresses: [
      {
        name: 'Priya Patel (Home)',
        phone: '+919898044556',
        street: '24 Shanti Sadan, Bodakdev',
        landmark: 'Opposite Judges Bungalow',
        city: 'Ahmedabad',
        state: 'Gujarat',
        stateCode: '24',
        pincode: '380054',
        isDefault: true,
      },
    ],
  });

  // 4. Create Approved Sellers
  console.log('🏪 Creating approved sellers (1 with GSTIN, 1 without)...');
  const seller1 = await Seller.create({
    userId: seller1User._id,
    shopName: 'Mrittika Studio',
    slug: 'mrittika-studio',
    legalName: 'Mrittika Pottery and Crafts LLP',
    bio: 'Preserving five generations of Kumartuli clay heritage. We craft contemporary terracotta pottery, ceramic tableware, and traditional folk artifacts.',
    location: 'Kumartuli, Kolkata, West Bengal',
    pickupAddress: {
      name: 'Mrittika Studio Dispatch',
      phone: '+919830012345',
      street: '14/2 Kumartuli Ghat Road',
      landmark: 'Near Kumartuli Park',
      city: 'Kolkata',
      state: 'West Bengal',
      stateCode: '19',
      pincode: '700005',
    },
    gstin: '19ABCDE1234F1Z5', // Has GSTIN
    panLast4: '1234',
    logoUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1200&q=80',
    status: 'approved',
    commissionRate: 8, // Custom negotiated 8% rate override
    rating: 4.8,
    totalSales: 42,
  });

  const seller2 = await Seller.create({
    userId: seller2User._id,
    shopName: 'Shantiniketan Leather Crafts',
    slug: 'shantiniketan-leather-crafts',
    legalName: 'Biren Mondal Crafts',
    bio: 'Authentic handmade vegetable-tanned leather bags, wallets, and embossed journals created using the heritage Shantiniketan batik-embossing technique.',
    location: 'Bolpur, Birbhum, West Bengal',
    pickupAddress: {
      name: 'Biren Mondal Workshop',
      phone: '+919434056789',
      street: 'Sonajhuri Haat Road, Ratan Pally',
      landmark: 'Opposite Amar Kutir',
      city: 'Bolpur',
      state: 'West Bengal',
      stateCode: '19',
      pincode: '731235',
    },
    gstin: null, // NO GSTIN -> Produces Bill of Supply
    panLast4: '5678',
    logoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=1200&q=80',
    status: 'approved',
    commissionRate: null, // Falls back to Category rate then Platform default
    rating: 4.9,
    totalSales: 68,
  });

  // 5. Create 12 Realistic Products
  console.log('🎨 Creating 12 handmade products across categories...');
  const productsData = [
    // --- Seller 1 (Mrittika Studio) Products ---
    {
      sellerId: seller1._id,
      categoryId: categoryMap.get('home-decor')!._id,
      title: 'Terracotta Matte Finish Chai Kulhar Set (Pack of 6)',
      slug: 'terracotta-matte-chai-kulhar-set-6',
      description: 'Handcrafted clay kulhars with organic beeswax lining. Fired in wood kiln for rich earthy aroma. Ideal for evening tea rituals.',
      price: 85000, // ₹850.00
      discountPrice: 75000, // ₹750.00
      stock: 25,
      fulfilmentType: 'ready_stock',
      productionDays: 0,
      customisationAvailable: false,
      materials: ['River Clay', 'Natural Terracotta', 'Organic Beeswax'],
      dimensions: { l: 7, w: 7, h: 9, unit: 'cm' },
      colors: ['Earthy Brown', 'Terracotta Red'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80',
          publicId: 'kp_products/kulhar_set_1',
          alt: 'Terracotta Kulhar Set',
        },
      ],
      hsnCode: '6912',
      gstRate: 12,
      status: 'approved',
      rating: 4.9,
      reviewCount: 18,
      isActive: true,
    },
    {
      sellerId: seller1._id,
      categoryId: categoryMap.get('home-decor')!._id,
      title: 'Hand-thrown Ceramic Flower Vase with Indigo Brushstrokes',
      slug: 'ceramic-flower-vase-indigo-brushstrokes',
      description: 'Stoneware pottery vase thrown on a traditional potters wheel and hand-painted with cobalt indigo strokes. Watertight and high-fired at 1220°C.',
      price: 185000, // ₹1,850.00
      discountPrice: 165000, // ₹1,650.00
      stock: 8,
      fulfilmentType: 'ready_stock',
      productionDays: 0,
      customisationAvailable: true,
      customisationPrompt: 'Enter custom initials or message for the vase base (max 20 chars)',
      materials: ['Stoneware Clay', 'Cobalt Glaze'],
      dimensions: { l: 12, w: 12, h: 22, unit: 'cm' },
      colors: ['Ivory White', 'Indigo Blue'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&q=80',
          publicId: 'kp_products/ceramic_vase_1',
          alt: 'Indigo Ceramic Vase',
        },
      ],
      hsnCode: '6912',
      gstRate: 12,
      status: 'approved',
      rating: 4.8,
      reviewCount: 12,
      isActive: true,
    },
    {
      sellerId: seller1._id,
      categoryId: categoryMap.get('art-and-crafts')!._id,
      title: 'Bankura Terracotta Folk Horse (Heritage Edition)',
      slug: 'bankura-terracotta-folk-horse-heritage',
      description: 'Iconic Panchmura Bankura horse with erect ears and arched neck. Crafted entirely by hand using hollow clay shaping techniques.',
      price: 240000, // ₹2,400.00
      discountPrice: null,
      stock: 10,
      fulfilmentType: 'made_to_order',
      productionDays: 5,
      customisationAvailable: false,
      materials: ['Bankura Alluvial Clay', 'Natural Ochre Slip'],
      dimensions: { l: 15, w: 10, h: 30, unit: 'cm' },
      colors: ['Rustic Ochre', 'Terracotta Red'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=800&q=80',
          publicId: 'kp_products/bankura_horse_1',
          alt: 'Bankura Terracotta Horse',
        },
      ],
      hsnCode: '9701',
      gstRate: 12,
      status: 'approved',
      rating: 5.0,
      reviewCount: 9,
      isActive: true,
    },
    {
      sellerId: seller1._id,
      categoryId: categoryMap.get('jewellery')!._id,
      title: 'Terracotta Hand-Painted Tribal Jhumka Earrings',
      slug: 'terracotta-hand-painted-tribal-jhumka-earrings',
      description: 'Lightweight baked terracotta jhumkas painted in vibrant folk motifs with brass hooks. Hypoallergenic and sealed with eco-varnish.',
      price: 65000, // ₹650.00
      discountPrice: 55000, // ₹550.00
      stock: 30,
      fulfilmentType: 'ready_stock',
      productionDays: 0,
      customisationAvailable: false,
      materials: ['Refined Clay', 'Acrylic Emulsion', 'Brass Findings'],
      dimensions: { l: 3, w: 3, h: 6, unit: 'cm' },
      colors: ['Mustard Yellow', 'Crimson Red', 'Forest Green'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
          publicId: 'kp_products/terracotta_jhumka_1',
          alt: 'Terracotta Tribal Jhumka Earrings',
        },
      ],
      hsnCode: '7117',
      gstRate: 3,
      status: 'approved',
      rating: 4.7,
      reviewCount: 14,
      isActive: true,
    },
    {
      sellerId: seller1._id,
      categoryId: categoryMap.get('gifts')!._id,
      title: 'Handcrafted Clay Diya & Incense Holder Gift Set',
      slug: 'handcrafted-clay-diya-incense-holder-gift-set',
      description: 'Set of 4 filigree clay lamps and a lotus-shaped dhoop holder packed in a handmade mulberry paper gift box.',
      price: 95000, // ₹950.00
      discountPrice: 85000, // ₹850.00
      stock: 20,
      fulfilmentType: 'ready_stock',
      productionDays: 0,
      customisationAvailable: true,
      customisationPrompt: 'Gift message for card (max 100 characters)',
      materials: ['Terracotta', 'Handmade Paper Box', 'Brass Ring'],
      dimensions: { l: 18, w: 18, h: 8, unit: 'cm' },
      colors: ['Terracotta', 'Gold Accent'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1605651202774-7d573fd3f12d?w=800&q=80',
          publicId: 'kp_products/diya_gift_set_1',
          alt: 'Clay Diya Gift Set',
        },
      ],
      hsnCode: '4820',
      gstRate: 12,
      status: 'approved',
      rating: 4.9,
      reviewCount: 21,
      isActive: true,
    },
    {
      sellerId: seller1._id,
      categoryId: categoryMap.get('art-and-crafts')!._id,
      title: 'Handmade Dokra Brass Wall Hanging — Sun God',
      slug: 'dokra-brass-wall-hanging-sun-god',
      description: 'Lost-wax cast brass tribal wall plaque depicting the auspicious Surya motif. Handcrafted by master artisans.',
      price: 320000, // ₹3,200.00
      discountPrice: null,
      stock: 6,
      fulfilmentType: 'made_to_order',
      productionDays: 7,
      customisationAvailable: false,
      materials: ['Bell Metal', 'Brass', 'Beeswax Core'],
      dimensions: { l: 20, w: 3, h: 20, unit: 'cm' },
      colors: ['Antique Brass Bronze'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
          publicId: 'kp_products/dokra_sun_1',
          alt: 'Dokra Brass Wall Hanging',
        },
      ],
      hsnCode: '9701',
      gstRate: 12,
      status: 'approved',
      rating: 4.9,
      reviewCount: 8,
      isActive: true,
    },

    // --- Seller 2 (Shantiniketan Leather Crafts) Products ---
    {
      sellerId: seller2._id,
      categoryId: categoryMap.get('fashion')!._id,
      title: 'Embossed Leather Tote Bag with Peacock Motif',
      slug: 'embossed-leather-tote-bag-peacock-motif',
      description: 'Authentic Shantiniketan vegetable-tanned goat leather shoulder bag featuring intricate embossed batik patterns and YKK zip closure.',
      price: 345000, // ₹3,450.00
      discountPrice: 299900, // ₹2,999.00
      stock: 14,
      fulfilmentType: 'ready_stock',
      productionDays: 0,
      customisationAvailable: true,
      customisationPrompt: 'Enter name or monogram to engrave inside leather tag (max 10 chars)',
      materials: ['Full Grain Goat Leather', 'Vegetable Dyes', 'Cotton Lining'],
      dimensions: { l: 36, w: 10, h: 28, unit: 'cm' },
      colors: ['Chestnut Tan', 'Rich Mahogany'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
          publicId: 'kp_products/leather_tote_1',
          alt: 'Shantiniketan Leather Tote Bag',
        },
      ],
      hsnCode: '4202',
      gstRate: 18,
      status: 'approved',
      rating: 4.9,
      reviewCount: 32,
      isActive: true,
    },
    {
      sellerId: seller2._id,
      categoryId: categoryMap.get('fashion')!._id,
      title: 'Hand-stitched Leather Bi-Fold Wallet with Floral Batik',
      slug: 'hand-stitched-leather-bifold-wallet-floral-batik',
      description: 'Slim genuine leather wallet with 6 card slots, 2 currency compartments, and embossed botanical artwork.',
      price: 125000, // ₹1,250.00
      discountPrice: 105000, // ₹1,050.00
      stock: 35,
      fulfilmentType: 'ready_stock',
      productionDays: 0,
      customisationAvailable: false,
      materials: ['Vegetable Tanned Leather', 'Waxed Thread'],
      dimensions: { l: 11, w: 2, h: 9, unit: 'cm' },
      colors: ['Burgundy', 'Honey Brown'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',
          publicId: 'kp_products/leather_wallet_1',
          alt: 'Leather Bi-Fold Wallet',
        },
      ],
      hsnCode: '4202',
      gstRate: 18,
      status: 'approved',
      rating: 4.8,
      reviewCount: 27,
      isActive: true,
    },
    {
      sellerId: seller2._id,
      categoryId: categoryMap.get('gifts')!._id,
      title: 'Handmade Leather Journal with Deckle Edge Handmade Paper',
      slug: 'handmade-leather-journal-deckle-edge-paper',
      description: '200-page vintage journal wrapped in hand-tooled leather with brass latch. 100% recycled tree-free cotton rag paper.',
      price: 145000, // ₹1,450.00
      discountPrice: null,
      stock: 18,
      fulfilmentType: 'ready_stock',
      productionDays: 0,
      customisationAvailable: true,
      customisationPrompt: 'Custom name embossed on journal cover (max 15 chars)',
      materials: ['Vegetable Tanned Leather', 'Cotton Rag Paper', 'Brass Lock'],
      dimensions: { l: 18, w: 3, h: 23, unit: 'cm' },
      colors: ['Antique Tan', 'Dark Forest Brown'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80',
          publicId: 'kp_products/leather_journal_1',
          alt: 'Handmade Leather Journal',
        },
      ],
      hsnCode: '4820',
      gstRate: 12,
      status: 'approved',
      rating: 5.0,
      reviewCount: 39,
      isActive: true,
    },
    {
      sellerId: seller2._id,
      categoryId: categoryMap.get('home-decor')!._id,
      title: 'Hand-tooled Leather Coaster Set with Wooden Stand (Set of 6)',
      slug: 'hand-tooled-leather-coaster-set-6',
      description: 'Hexagonal heat-resistant leather coasters with intricate geometric patterns, complete with a handcrafted sheesham wood holder.',
      price: 79000, // ₹790.00
      discountPrice: 69000, // ₹690.00
      stock: 40,
      fulfilmentType: 'ready_stock',
      productionDays: 0,
      customisationAvailable: false,
      materials: ['Tooled Leather', 'Sheesham Wood Base'],
      dimensions: { l: 10, w: 10, h: 4, unit: 'cm' },
      colors: ['Cognac Tan', 'Dark Chocolate'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800&q=80',
          publicId: 'kp_products/leather_coasters_1',
          alt: 'Leather Coasters Set',
        },
      ],
      hsnCode: '4205',
      gstRate: 18,
      status: 'approved',
      rating: 4.6,
      reviewCount: 15,
      isActive: true,
    },
    {
      sellerId: seller2._id,
      categoryId: categoryMap.get('jewellery')!._id,
      title: 'Hand-braided Leather Cuff Bracelet with Brass Beads',
      slug: 'hand-braided-leather-cuff-bracelet-brass-beads',
      description: 'Artisan unisex wristband made with supple braided leather cords, Dokra brass spacer beads, and magnetic locking clasp.',
      price: 55000, // ₹550.00
      discountPrice: 48000, // ₹480.00
      stock: 22,
      fulfilmentType: 'ready_stock',
      productionDays: 0,
      customisationAvailable: false,
      materials: ['Genuine Leather Cord', 'Dokra Brass', 'Magnetic Steel Clasp'],
      dimensions: { l: 20, w: 1.5, h: 0.5, unit: 'cm' },
      colors: ['Distressed Black', 'Tan Brown'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1611591475819-3543632ab3e3?w=800&q=80',
          publicId: 'kp_products/leather_bracelet_1',
          alt: 'Leather Cuff Bracelet',
        },
      ],
      hsnCode: '7117',
      gstRate: 3,
      status: 'approved',
      rating: 4.8,
      reviewCount: 11,
      isActive: true,
    },
    {
      sellerId: seller2._id,
      categoryId: categoryMap.get('fashion')!._id,
      title: 'Custom Made-to-Order Leather Messenger Laptop Bag',
      slug: 'custom-leather-messenger-laptop-bag',
      description: 'Custom handcrafted 15.6-inch padded laptop satchel with adjustable shoulder strap, brass buckles, and dual front organizer pockets.',
      price: 520000, // ₹5,200.00
      discountPrice: 469900, // ₹4,699.00
      stock: 12,
      fulfilmentType: 'made_to_order',
      productionDays: 6,
      customisationAvailable: true,
      customisationPrompt: 'Specify laptop model/size and custom initials for outer flap',
      materials: ['Full Grain Leather', 'Antique Brass Hardware', 'Suede Lining'],
      dimensions: { l: 40, w: 12, h: 30, unit: 'cm' },
      colors: ['Vintage Saddle Tan', 'Charcoal Brown'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
          publicId: 'kp_products/leather_messenger_1',
          alt: 'Leather Messenger Bag',
        },
      ],
      hsnCode: '4202',
      gstRate: 18,
      status: 'approved',
      rating: 5.0,
      reviewCount: 16,
      isActive: true,
    },
  ];

  const products = await Product.insertMany(productsData);

  // 6. Create Audit Log for Seeding
  console.log('📝 Creating initial audit log entry...');
  await AuditLog.create({
    actorId: adminUser._id,
    actorRole: 'admin',
    action: 'database_seeded',
    entityType: 'System',
    entityId: 'SYSTEM_SEED',
    metadata: {
      categoriesCount: categories.length,
      sellersCount: 2,
      productsCount: products.length,
      customersCount: 3,
    },
    timestamp: new Date(),
    ip: '127.0.0.1',
  });

  console.log('\n======================================================');
  console.log('✅ Kumor Para Database Seeded Successfully!');
  console.log('======================================================');
  console.log(`📦 Categories: ${categories.length} seeded (${categories.map((c) => c.name).join(', ')})`);
  console.log(`👤 Admin:      ${adminUser.email} (Password: ${defaultPassword})`);
  console.log(`🏪 Sellers:    2 approved`);
  console.log(`   - ${seller1.shopName} (GSTIN: ${seller1.gstin}, Commission: ${seller1.commissionRate}%)`);
  console.log(`   - ${seller2.shopName} (GSTIN: None/Bill of supply, Commission: Category/Platform default)`);
  console.log(`🎨 Products:   ${products.length} active products in paise`);
  console.log(`👥 Customers:  3 customers across WB (19), MH (27), GJ (24)`);
  console.log(`⚙️  Settings:   Platform Commission = ${settings.platformCommissionRate}%, FY = ${settings.financialYear}`);
  console.log('======================================================\n');

  if (shouldDisconnect) {
    await disconnectDB();
  }
}

// Run directly when executed
if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  seedDatabase(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
