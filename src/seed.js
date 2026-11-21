import { hashPassword } from "better-auth/crypto";
import { connectToMongoDB, getCollections } from "./config/db.js";

export const SEED_USERS = [
  {
    _id: "usr-admin-1",
    id: "usr-admin-1",
    name: "WedPlan Admin",
    email: "admin@wedplan.com",
    passwordPlain: "Admin123",
    emailVerified: true,
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=240&q=80",
    role: "admin",
    isBlocked: false,
    phone: "+8801700000000",
    location: "Gulshan-2, Dhaka",
    bio: "Platform Operations & Vendor Quality Assurance Administrator.",
    subscriptionPlan: "free",
    subscriptionExpiresAt: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  },
  {
    _id: "usr-vend-1",
    id: "usr-vend-1",
    name: "Tariq Mahmud",
    email: "contact@emeraldhospitality.com",
    passwordPlain: "Vendor123",
    emailVerified: true,
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    role: "vendor",
    isBlocked: false,
    phone: "+8801711223344",
    location: "Gulshan, Dhaka",
    businessName: "Emerald Hospitality & Venues",
    bio: "Premier luxury banquet halls, glasshouse lawns, and heritage venues in Dhaka.",
    subscriptionPlan: "free",
    subscriptionExpiresAt: null,
    createdAt: new Date("2026-08-15T09:00:00.000Z"),
    updatedAt: new Date("2026-08-15T09:00:00.000Z"),
  },
  {
    _id: "usr-vend-2",
    id: "usr-vend-2",
    name: "Ayman Chowdhury",
    email: "studio@frameandfocus.bd",
    passwordPlain: "Vendor123",
    emailVerified: true,
    image:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=240&q=80",
    role: "vendor",
    isBlocked: false,
    phone: "+8801819556677",
    location: "Banani, Dhaka",
    businessName: "Frame & Focus Studio",
    bio: "Documentary wedding photography and 4K cinema films across Bangladesh.",
    subscriptionPlan: "premium",
    subscriptionExpiresAt: "2027-11-21T00:00:00.000Z",
    createdAt: new Date("2026-08-20T11:30:00.000Z"),
    updatedAt: new Date("2026-08-20T11:30:00.000Z"),
  },
  {
    _id: "usr-vend-3",
    id: "usr-vend-3",
    name: "Sadia Afrin",
    email: "hello@sadiafloral.com",
    passwordPlain: "Vendor123",
    emailVerified: true,
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80",
    role: "vendor",
    isBlocked: false,
    phone: "+8801713889900",
    location: "Dhanmondi, Dhaka",
    businessName: "Sadia Floral Design",
    bio: "Bespoke fresh floral architecture, Holud sets, and reception stage styling.",
    subscriptionPlan: "premium",
    subscriptionExpiresAt: "2027-09-10T00:00:00.000Z",
    createdAt: new Date("2026-09-02T16:10:00.000Z"),
    updatedAt: new Date("2026-09-02T16:10:00.000Z"),
  },
  {
    _id: "usr-vend-4",
    id: "usr-vend-4",
    name: "Zara Haque",
    email: "bookings@zarabridal.com",
    passwordPlain: "Vendor123",
    emailVerified: true,
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&q=80",
    role: "vendor",
    isBlocked: false,
    phone: "+8801715667788",
    location: "Baridhara, Dhaka",
    businessName: "Zara Bridal Studio",
    bio: "Signature HD airbrush bridal makeovers and luxury hair styling.",
    subscriptionPlan: "free",
    subscriptionExpiresAt: null,
    createdAt: new Date("2026-09-14T12:00:00.000Z"),
    updatedAt: new Date("2026-09-14T12:00:00.000Z"),
  },
  {
    _id: "usr-cust-1",
    id: "usr-cust-1",
    name: "Tasnim Ferdous",
    email: "customer@wedplan.com",
    passwordPlain: "Customer123",
    emailVerified: true,
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
    role: "customer",
    isBlocked: false,
    phone: "+8801812334455",
    location: "Gulshan, Dhaka",
    bio: "Shortlisting venues and photography teams for our winter wedding reception.",
    subscriptionPlan: "free",
    subscriptionExpiresAt: null,
    createdAt: new Date("2026-10-12T14:22:00.000Z"),
    updatedAt: new Date("2026-10-12T14:22:00.000Z"),
  },
  {
    _id: "usr-cust-3",
    id: "usr-cust-3",
    name: "Rafsan Kabir",
    email: "rafsan.kabir@example.com",
    passwordPlain: "Customer123",
    emailVerified: true,
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80",
    role: "customer",
    isBlocked: true,
    phone: "+8801911223399",
    location: "Uttara, Dhaka",
    bio: "Account suspended due to repeated spam booking inquiries.",
    subscriptionPlan: "free",
    subscriptionExpiresAt: null,
    createdAt: new Date("2026-09-18T08:40:00.000Z"),
    updatedAt: new Date("2026-09-18T08:40:00.000Z"),
  },
];

export const SEED_SERVICES = [
  {
    _id: "srv-101",
    id: "srv-101",
    vendorId: "usr-vend-1",
    serviceName: "Greenhouse Lawn & Banquet Hall",
    category: "Wedding Venues",
    price: 4500,
    priceUnit: "Full Day Rental",
    location: "Gulshan, Dhaka",
    images: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "approved",
    isActive: true,
    createdAt: "2026-09-05T10:00:00.000Z",
    shortSummary:
      "Indoor hall and outdoor lawn accommodating up to 650 guests with dedicated bridal dressing rooms and valet parking.",
    description:
      "Set amidst manicured botanical gardens in Gulshan, our Greenhouse Lawn & Banquet Hall offers a seamless indoor-outdoor setting for grand wedding receptions and Nikah ceremonies. The property features a climate-controlled glass pavilion, lush open-air courtyard, private bridal and groom suites, industrial generator backup, and full catering kitchen access.",
    highlights: [
      "Up to 650 banquet guests capacity",
      "Private climate-controlled bridal & groom dressing suites",
      "Outdoor botanical lawn + indoor crystal chandelier dining hall",
      "Dual 500kVA generator backup & 120-car valet parking",
    ],
    vendor: {
      id: "usr-vend-1",
      name: "Tariq Mahmud",
      businessName: "Emerald Hospitality & Venues",
      role: "Venue Partner",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
      rating: 4.9,
      reviewsCount: 184,
      verified: true,
      isPremium: false,
      experienceYears: 12,
      phone: "+8801711223344",
      email: "contact@emeraldhospitality.com",
    },
  },
  {
    _id: "srv-102",
    id: "srv-102",
    vendorId: "usr-vend-2",
    serviceName: "Complete Wedding Photography & Cinematography",
    category: "Photography & Videography",
    price: 1850,
    priceUnit: "3-Event Package",
    location: "Banani, Dhaka",
    images: [
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "approved",
    isActive: true,
    createdAt: "2026-09-10T11:30:00.000Z",
    shortSummary:
      "Full coverage for Holud, Wedding, and Reception with two senior photographers, cinematography team, and printed photo albums.",
    description:
      "Our flagship 3-Event Wedding Story package captures every candid moment, family portrait, and cinematic highlight across your Gaye Holud, Nikah, and Reception. Directed by senior visual storytellers using full-frame Sony cinema cameras, drone aerials, and archival Italian lay-flat photo books.",
    highlights: [
      "2 Lead Photographers + 2 4K Cinematographers for 3 events",
      "35-minute documentary film & 4-minute cinematic highlight trailer",
      "80-page handcrafted linen lay-flat wedding album",
      "Private cloud gallery with 800+ color-graded high-res images",
    ],
    vendor: {
      id: "usr-vend-2",
      name: "Ayman Chowdhury",
      businessName: "Frame & Focus Studio",
      role: "Photography Team",
      avatar:
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=240&q=80",
      rating: 4.9,
      reviewsCount: 242,
      verified: true,
      isPremium: true,
      experienceYears: 9,
      phone: "+8801819556677",
      email: "studio@frameandfocus.bd",
    },
  },
  {
    _id: "srv-103",
    id: "srv-103",
    vendorId: "usr-vend-3",
    serviceName: "Fresh Floral Stage & Hall Decoration",
    category: "Decoration & Florist",
    price: 2400,
    priceUnit: "Stage + Entrance + Dining",
    location: "Dhanmondi, Dhaka",
    images: [
      "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "approved",
    isActive: true,
    createdAt: "2026-09-12T15:20:00.000Z",
    shortSummary:
      "Custom wedding stage backdrop, fresh flower entrance gate, table centerpieces, and warm ambient stage lighting.",
    description:
      "Transform your venue into an editorial floral sanctuary. We source fresh Dutch roses, white phalaenopsis orchids, hydrangeas, and tuberose daily to craft custom architectural stage backdrops, welcoming floral tunnels, bridal walkway arrangements, and warm tungsten pin-spot lighting.",
    highlights: [
      "Fresh imported roses, orchids, and seasonal local blooms",
      "32-foot custom architectural stage & couple seating lounge",
      "Illuminated floral entrance archway & photo corner",
      "35 guest dining table floral centerpieces & candle styling",
    ],
    vendor: {
      id: "usr-vend-3",
      name: "Sadia Afrin",
      businessName: "Sadia Floral Design",
      role: "Event Decorator",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80",
      rating: 4.8,
      reviewsCount: 159,
      verified: true,
      isPremium: true,
      experienceYears: 8,
      phone: "+8801713889900",
      email: "hello@sadiafloral.com",
    },
  },
  {
    _id: "srv-104",
    id: "srv-104",
    vendorId: "usr-vend-1",
    serviceName: "Traditional Shahi Wedding Catering",
    category: "Catering Services",
    price: 2800,
    priceUnit: "300 Guests Full Menu",
    location: "Uttara, Dhaka",
    images: [
      "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "approved",
    isActive: true,
    createdAt: "2026-09-18T09:45:00.000Z",
    shortSummary:
      "Basmati Kacchi Biryani, chicken roast, beef rezala, borhani, and traditional desserts with full crockery and waitstaff.",
    description:
      "Prepared by traditional Old Dhaka master bawarchis using aged chinigura and basmati rice, premium saffron, and pure ghee. Package covers complete 300-guest banquet service including bone-china crockery, chafing dishes, uniformed stewards, and a dedicated head table service team.",
    highlights: [
      "Saffron Basmati Kacchi Biryani & Shahi Chicken Roast",
      "Slow-cooked Beef Rezala, Shami Kebab & Spiced Borhani",
      "Pistachio Firni, Shahi Jorda & live artisan coffee bar",
      "Complete bone-china dinnerware, linens & 30 uniformed waiters",
    ],
    vendor: {
      id: "usr-vend-1",
      name: "Tariq Mahmud",
      businessName: "Emerald Hospitality & Venues",
      role: "Wedding Caterer",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
      rating: 4.9,
      reviewsCount: 310,
      verified: true,
      isPremium: false,
      experienceYears: 18,
      phone: "+8801711223344",
      email: "contact@emeraldhospitality.com",
    },
  },
  {
    _id: "srv-105",
    id: "srv-105",
    vendorId: "usr-vend-4",
    serviceName: "Bridal Makeup & Hair Styling Package",
    category: "Makeup & Styling",
    price: 950,
    priceUnit: "Holud + Wedding + Reception",
    location: "Baridhara, Dhaka",
    images: [
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "approved",
    isActive: true,
    createdAt: "2026-09-22T14:15:00.000Z",
    shortSummary:
      "Complete bridal makeover, hair styling, saree/lehenga draping, and jewelry setting for all three wedding events.",
    description:
      "Look radiant under both studio lighting and candid close-ups. Zara Haque and her senior bridal artists use luxury skin prep and waterproof HD airbrush formulas tailored to South Asian undertones, complete with custom floral hairpieces, dupatta pinning, and a pre-wedding skin & look consultation.",
    highlights: [
      "Waterproof HD bridal makeup for Holud, Nikah & Reception",
      "Bespoke updo hairstyling with fresh floral accessories",
      "Precision saree/lehenga pleating, veil & heavy jewelry setting",
      "1-on-1 pre-event trial & skincare consultation included",
    ],
    vendor: {
      id: "usr-vend-4",
      name: "Zara Haque",
      businessName: "Zara Bridal Studio",
      role: "Bridal Makeup Artist",
      avatar:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&q=80",
      rating: 4.9,
      reviewsCount: 276,
      verified: true,
      isPremium: false,
      experienceYears: 10,
      phone: "+8801715667788",
      email: "bookings@zarabridal.com",
    },
  },
  {
    _id: "srv-106",
    id: "srv-106",
    vendorId: "usr-vend-3",
    serviceName: "Handwoven Bridal Lehenga & Groom Sherwani",
    category: "Wedding Fashion",
    price: 3200,
    priceUnit: "Couple Couture Set",
    location: "Gulshan, Dhaka",
    images: [
      "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "approved",
    isActive: true,
    createdAt: "2026-09-25T16:00:00.000Z",
    shortSummary:
      "Made-to-measure bridal lehenga in pure Katan silk with zardozi embroidery and a coordinated groom sherwani set.",
    description:
      "Handcrafted over 450 artisan hours in our Gulshan atelier. The bridal ensemble features pure Benarasi Katan silk adorned with intricate dabka, zardozi, and resham hand-embroidery with a double-border net veil. Paired with a custom raw-silk groom sherwani, hand-tied pagri, and Pashmina dushala.",
    highlights: [
      "Custom-measured pure Katan silk bridal lehenga & double dupatta",
      "Coordinated groom raw-silk sherwani, pagri & embroidered shawl",
      "3 private fitting sessions with master tailors at Gulshan studio",
      "Complimentary steam pressing & archival garment preservation box",
    ],
    vendor: {
      id: "usr-vend-3",
      name: "Sadia Afrin",
      businessName: "Sadia Floral Design",
      role: "Bridal Wear Designer",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80",
      rating: 4.8,
      reviewsCount: 138,
      verified: true,
      isPremium: true,
      experienceYears: 15,
      phone: "+8801713889900",
      email: "hello@sadiafloral.com",
    },
  },
  {
    _id: "srv-107",
    id: "srv-107",
    vendorId: "usr-vend-2",
    serviceName: "Destination Wedding Drone & Cinema Story",
    category: "Photography & Videography",
    price: 2650,
    priceUnit: "2-Day Resort Coverage",
    location: "Sylhet",
    images: [
      "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "approved",
    isActive: true,
    createdAt: "2026-10-01T12:00:00.000Z",
    shortSummary:
      "Dedicated destination wedding team for tea-garden and resort celebrations with FPV drone reels and same-day edit.",
    description:
      "Designed for destination weddings in Sylhet and Chittagong hill resorts. Our 5-person production crew travels with cinema lighting, dual 4K drones, and on-site editors to deliver a same-day reception teaser alongside full documentary coverage.",
    highlights: [
      "Same-day reception highlight edit screened at your venue",
      "4K aerial drone cinematography & golden-hour couple session",
      "Unlimited high-resolution photos with 14-day express delivery",
      "Travel & equipment logistics within Bangladesh included",
    ],
    vendor: {
      id: "usr-vend-2",
      name: "Ayman Chowdhury",
      businessName: "Frame & Focus Studio",
      role: "Photography Team",
      avatar:
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=240&q=80",
      rating: 4.9,
      reviewsCount: 242,
      verified: true,
      isPremium: true,
      experienceYears: 9,
      phone: "+8801819556677",
      email: "studio@frameandfocus.bd",
    },
  },
  {
    _id: "srv-108",
    id: "srv-108",
    vendorId: "usr-vend-1",
    serviceName: "Heritage Waterfront Convention Center",
    category: "Wedding Venues",
    price: 5200,
    priceUnit: "Grand Ballroom + Terrace",
    location: "Chittagong",
    images: [
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "approved",
    isActive: true,
    createdAt: "2026-10-03T09:00:00.000Z",
    shortSummary:
      "Pillarless grand ballroom for up to 1,000 guests with waterfront sunset deck, VIP lounges, and in-house acoustic system.",
    description:
      "Chittagong's premier pillarless wedding convention hall featuring 28-foot ceilings, Austrian crystal chandeliers, a breezy waterfront terrace for evening mocktail bars, and segregated VIP dining zones.",
    highlights: [
      "Up to 1,000 guests in main ballroom + 300 on waterfront deck",
      "Dedicated VIP family lounge & 2 bridal makeup suites",
      "Architectural acoustic ceiling & Bose line-array PA system",
      "200-car secure underground parking with lift access",
    ],
    vendor: {
      id: "usr-vend-1",
      name: "Tariq Mahmud",
      businessName: "Emerald Hospitality & Venues",
      role: "Venue Partner",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
      rating: 4.9,
      reviewsCount: 184,
      verified: true,
      isPremium: false,
      experienceYears: 12,
      phone: "+8801711223344",
      email: "contact@emeraldhospitality.com",
    },
  },
  {
    _id: "srv-109-pending",
    id: "srv-109-pending",
    vendorId: "usr-vend-1",
    serviceName: "Rooftop Garden Nikah & Intimate Dinner Lounge",
    category: "Wedding Venues",
    price: 1650,
    priceUnit: "150 Guests Evening Slot",
    location: "Banani, Dhaka",
    images: [
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "pending",
    isActive: false,
    createdAt: "2026-11-18T14:00:00.000Z",
    shortSummary:
      "Boutique open-air rooftop sanctuary in Banani ideal for intimate Nikah ceremonies, ring exchanges, and 150-guest dinners.",
    description:
      "An intimate fairy-lit rooftop terrace overlooking the Banani skyline, complete with pergola seating, acoustic stage corner, and private elevator access. Currently awaiting admin review.",
    highlights: [
      "Accommodates 150 seated guests",
      "Canopy fairy lighting & wooden pergola arch included",
      "Dedicated prayer room for Nikah solemnization",
    ],
    vendor: {
      id: "usr-vend-1",
      name: "Tariq Mahmud",
      businessName: "Emerald Hospitality & Venues",
      role: "Venue Partner",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
      rating: 4.9,
      reviewsCount: 184,
      verified: true,
      isPremium: false,
      experienceYears: 12,
      phone: "+8801711223344",
      email: "contact@emeraldhospitality.com",
    },
  },
  {
    _id: "srv-110-pending",
    id: "srv-110-pending",
    vendorId: "usr-vend-4",
    serviceName: "Bridesmaid & Family Glam Squad Package (6 Persons)",
    category: "Makeup & Styling",
    price: 680,
    priceUnit: "Group of 6 Event Glam",
    location: "Baridhara, Dhaka",
    images: [
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80",
    ],
    status: "pending",
    isActive: true,
    createdAt: "2026-11-19T11:20:00.000Z",
    shortSummary:
      "On-location party makeup, hair blowouts, and saree draping for up to 6 family members or bridesmaids at your hotel or home.",
    description:
      "Our mobile glam team travels directly to your residence or hotel suite with studio ring lights, luxury palettes, and hair tools so the bride's mother, sisters, and bridesmaids get ready comfortably together.",
    highlights: [
      "3 Senior Party Makeup Artists + 2 Hair Stylists on-site",
      "Long-wear soft glam makeup & falsies included for 6 guests",
      "Complete saree & lehenga pinning",
    ],
    vendor: {
      id: "usr-vend-4",
      name: "Zara Haque",
      businessName: "Zara Bridal Studio",
      role: "Bridal Makeup Artist",
      avatar:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&q=80",
      rating: 4.9,
      reviewsCount: 276,
      verified: true,
      isPremium: false,
      experienceYears: 10,
      phone: "+8801715667788",
      email: "bookings@zarabridal.com",
    },
  },
  {
    _id: "srv-111-rejected",
    id: "srv-111-rejected",
    vendorId: "usr-vend-1",
    serviceName: "Unverified Budget Hall (Incomplete Safety Docs)",
    category: "Wedding Venues",
    price: 800,
    priceUnit: "Per Event",
    location: "Mirpur, Dhaka",
    images: [
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80",
    ],
    status: "rejected",
    isActive: false,
    createdAt: "2026-10-28T09:10:00.000Z",
    shortSummary:
      "Rejected during admin compliance review due to missing fire-safety certification and unclear deliverable pricing.",
    description:
      "This listing was rejected by platform administrators and is hidden from public customer views.",
    highlights: ["Capacity 250 guests"],
    vendor: {
      id: "usr-vend-1",
      name: "Tariq Mahmud",
      businessName: "Emerald Hospitality & Venues",
      role: "Venue Partner",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
      rating: 4.9,
      reviewsCount: 184,
      verified: true,
      isPremium: false,
      experienceYears: 12,
      phone: "+8801711223344",
      email: "contact@emeraldhospitality.com",
    },
  },
];

export const SEED_BOOKINGS = [
  {
    _id: "bkg-2001",
    id: "bkg-2001",
    serviceId: "srv-101",
    vendorId: "usr-vend-1",
    customerId: "usr-cust-1",
    eventDate: "2026-12-18",
    eventLocation: "Gulshan-2, Plot 42, Dhaka",
    message:
      "We are expecting around 550 guests for our evening reception. Please confirm if the outdoor botanical lawn will be available from 4:00 PM.",
    status: "Pending",
    createdAt: "2026-11-15T14:30:00.000Z",
    serviceName: "Greenhouse Lawn & Banquet Hall",
    serviceImage:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    serviceCategory: "Wedding Venues",
    servicePrice: 4500,
    vendorName: "Tariq Mahmud",
    vendorBusinessName: "Emerald Hospitality & Venues",
    vendorEmail: "contact@emeraldhospitality.com",
    vendorPhone: "+8801711223344",
    customerName: "Tasnim Ferdous",
    customerEmail: "customer@wedplan.com",
    customerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
  },
  {
    _id: "bkg-2002",
    id: "bkg-2002",
    serviceId: "srv-102",
    vendorId: "usr-vend-2",
    customerId: "usr-cust-1",
    eventDate: "2026-12-17",
    eventLocation: "Banani Club Ground & Gulshan Hall, Dhaka",
    message:
      "Looking to book your 3-event photography and cinematography team for Dec 16, 17, and 18.",
    status: "Accepted",
    createdAt: "2026-11-10T09:15:00.000Z",
    serviceName: "Complete Wedding Photography & Cinematography",
    serviceImage:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80",
    serviceCategory: "Photography & Videography",
    servicePrice: 1850,
    vendorName: "Ayman Chowdhury",
    vendorBusinessName: "Frame & Focus Studio",
    vendorEmail: "studio@frameandfocus.bd",
    vendorPhone: "+8801819556677",
    customerName: "Tasnim Ferdous",
    customerEmail: "customer@wedplan.com",
    customerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
  },
  {
    _id: "bkg-2003",
    id: "bkg-2003",
    serviceId: "srv-104",
    vendorId: "usr-vend-1",
    customerId: "usr-cust-1",
    eventDate: "2026-12-24",
    eventLocation: "Uttara Community Banquet Hall, Dhaka",
    message:
      "Requesting full 300-guest Shahi Kacchi Biryani menu with live coffee bar for our Walima reception.",
    status: "Accepted",
    createdAt: "2026-11-16T18:05:00.000Z",
    serviceName: "Traditional Shahi Wedding Catering",
    serviceImage:
      "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80",
    serviceCategory: "Catering Services",
    servicePrice: 2800,
    vendorName: "Tariq Mahmud",
    vendorBusinessName: "Emerald Hospitality & Venues",
    vendorEmail: "contact@emeraldhospitality.com",
    vendorPhone: "+8801711223344",
    customerName: "Tasnim Ferdous",
    customerEmail: "customer@wedplan.com",
    customerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
  },
  {
    _id: "bkg-2004",
    id: "bkg-2004",
    serviceId: "srv-105",
    vendorId: "usr-vend-4",
    customerId: "usr-cust-1",
    eventDate: "2026-11-28",
    eventLocation: "Baridhara DOHS, Dhaka",
    message:
      "Need early morning Nikah makeover at 9:30 AM. Checking artist availability.",
    status: "Rejected",
    createdAt: "2026-11-02T11:45:00.000Z",
    serviceName: "Bridal Makeup & Hair Styling Package",
    serviceImage:
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=600&q=80",
    serviceCategory: "Makeup & Styling",
    servicePrice: 950,
    vendorName: "Zara Haque",
    vendorBusinessName: "Zara Bridal Studio",
    vendorEmail: "bookings@zarabridal.com",
    vendorPhone: "+8801715667788",
    customerName: "Tasnim Ferdous",
    customerEmail: "customer@wedplan.com",
    customerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
  },
];

export const SEED_TRANSACTIONS = [
  {
    _id: "txn-9001",
    id: "txn-9001",
    vendorId: "usr-vend-2",
    vendorName: "Ayman Chowdhury",
    vendorBusinessName: "Frame & Focus Studio",
    vendorEmail: "studio@frameandfocus.bd",
    plan: "Premium",
    amount: 49,
    currency: "USD",
    stripeSessionId: "cs_test_a1B2c3D4e5F6g7H8i9J0k1L2",
    stripeSubscriptionId: "sub_1QWedPlanFrameFocus99",
    status: "succeeded",
    createdAt: "2026-10-21T10:12:00.000Z",
  },
  {
    _id: "txn-9002",
    id: "txn-9002",
    vendorId: "usr-vend-3",
    vendorName: "Sadia Afrin",
    vendorBusinessName: "Sadia Floral Design",
    vendorEmail: "hello@sadiafloral.com",
    plan: "Premium",
    amount: 49,
    currency: "USD",
    stripeSessionId: "cs_test_z9Y8x7W6v5U4t3S2r1Q0p9O8",
    stripeSubscriptionId: "sub_1QWedPlanSadiaFloral77",
    status: "succeeded",
    createdAt: "2026-09-10T16:40:00.000Z",
  },
  {
    _id: "txn-9003",
    id: "txn-9003",
    vendorId: "usr-vend-4",
    vendorName: "Zara Haque",
    vendorBusinessName: "Zara Bridal Studio",
    vendorEmail: "bookings@zarabridal.com",
    plan: "Premium",
    amount: 49,
    currency: "USD",
    stripeSessionId: "cs_test_pending_zara_session_44",
    stripeSubscriptionId: "sub_1QWedPlanZaraPending44",
    status: "pending",
    createdAt: "2026-11-19T12:05:00.000Z",
  },
];

/**
 * Seeds MongoDB collections if needed and ensures demo Admin, Vendor, and Customer
 * accounts exist with valid Better Auth password hashes.
 */
export async function ensureSeedData() {
  await connectToMongoDB();
  const { users, accounts, services, bookings, transactions } = getCollections();

  // 1. Seed or update demo users + Better Auth credential accounts
  for (const seedUser of SEED_USERS) {
    const { passwordPlain, ...userFields } = seedUser;
    const existingUser = await users.findOne({ email: userFields.email });

    let targetUserId = userFields._id;
    if (!existingUser) {
      await users.insertOne(userFields);
    } else {
      targetUserId = existingUser._id;
      await users.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            id: String(existingUser.id || existingUser._id),
            role: userFields.role,
            isBlocked: existingUser.isBlocked ?? userFields.isBlocked,
            businessName: existingUser.businessName || userFields.businessName,
            subscriptionPlan:
              existingUser.subscriptionPlan || userFields.subscriptionPlan,
            subscriptionExpiresAt:
              existingUser.subscriptionExpiresAt ??
              userFields.subscriptionExpiresAt,
            phone: existingUser.phone || userFields.phone,
            location: existingUser.location || userFields.location,
            bio: existingUser.bio || userFields.bio,
          },
        }
      );
    }

    const existingAccount = await accounts.findOne({
      userId: targetUserId,
      providerId: "credential",
    });

    if (!existingAccount && passwordPlain) {
      const hashedPassword = await hashPassword(passwordPlain);
      await accounts.insertOne({
        _id: `acc-${String(targetUserId)}`,
        accountId: String(targetUserId),
        providerId: "credential",
        userId: targetUserId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // Ensure any existing user in DB has default required schema attributes
  await users.updateMany(
    { role: { $exists: false } },
    { $set: { role: "customer" } }
  );
  await users.updateMany(
    { isBlocked: { $exists: false } },
    { $set: { isBlocked: false } }
  );
  await users.updateMany(
    { subscriptionPlan: { $exists: false } },
    { $set: { subscriptionPlan: "free", subscriptionExpiresAt: null } }
  );

  // 2. Seed services if empty
  const servicesCount = await services.countDocuments({});
  if (servicesCount === 0) {
    await services.insertMany(SEED_SERVICES);
    console.log(`Seeded ${SEED_SERVICES.length} wedding services into MongoDB.`);
  }

  // 3. Seed bookings if empty
  const bookingsCount = await bookings.countDocuments({});
  if (bookingsCount === 0) {
    await bookings.insertMany(SEED_BOOKINGS);
    console.log(`Seeded ${SEED_BOOKINGS.length} bookings into MongoDB.`);
  }

  // 4. Seed transactions if empty
  const transactionsCount = await transactions.countDocuments({});
  if (transactionsCount === 0) {
    await transactions.insertMany(SEED_TRANSACTIONS);
    console.log(`Seeded ${SEED_TRANSACTIONS.length} transactions into MongoDB.`);
  }
}

// Allow running directly via `npm run seed`
if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("src/seed.js")
) {
  ensureSeedData()
    .then(() => {
      console.log("Database seed completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Database seed failed:", err);
      process.exit(1);
    });
}
