const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment");
  process.exit(1);
}

const samplePosts = [
  {
    slug: "canadian-cross-border-freight-regulations-2026",
    title: {
      en: "Navigating Canadian Cross-Border Freight in 2026: 5 Key Regulatory Updates",
      fr: "Naviguer dans le Fret Transfrontalier Canadien en 2026 : 5 Mises à Jour Réglementaires Clés",
    },
    excerpt: {
      en: "An essential breakdown of CBSA CARM release requirements, FDA e-manifest protocols, and intermodal customs clearance strategies for North American shippers.",
      fr: "Un aperçu essentiel des exigences de l'ASFC (GCRA), des protocoles de manifeste électronique et des stratégies de dédouanement intermodal pour les expéditeurs nord-américains.",
    },
    content: {
      en: `<h2>Streamlining U.S.–Canada Cross-Border Logistics</h2>
<p>Cross-border commerce between Canada and the United States continues to evolve rapidly. For shippers moving automotive parts, industrial machinery, and consumer goods, staying ahead of digital customs mandates is crucial to avoid costly border delays.</p>

<div class="blog-annotation">
  <strong style="color: #0B2545; display: block; margin-bottom: 0.25rem;">📌 Key Regulatory Takeaway:</strong>
  <p style="margin: 0; color: #334155;">All commercial importers into Canada must ensure their CARM Client Portal accounts are fully delegated and financial security bonds are actively validated before freight arrives at ports of entry.</p>
</div>

<h3>1. Digital Customs Mandates & CARM Final Phase</h3>
<p>The Canada Border Services Agency (CBSA) has fully transitioned to the Assessment and Revenue Management (CARM) system. Shippers who maintain <mark class="highlight-mark">pre-cleared e-manifest filings</mark> typically experience transit clearance times under 15 minutes at high-volume border crossings such as Windsor-Detroit and Fort Erie-Buffalo.</p>

<h3>2. Fast-Track Customs Best Practices</h3>
<ul>
  <li><strong>Synchronized Documentation:</strong> Ensure commercial invoices align with Harmonized System (HS) codes.</li>
  <li><strong>PARS & PAPS Pre-Arrival Filings:</strong> Barcode tracking should be confirmed 2 hours prior to physical truck arrival.</li>
  <li><strong>Customs Bond Optimization:</strong> Maintain sufficient security allowances to avoid cargo release holds.</li>
</ul>

<p>For tailored customs advisory or freight rate estimations, explore our dedicated <a href="https://transimex-canada.com/quote" target="_blank" rel="noopener noreferrer">instant freight quote portal</a>.</p>`,
      fr: `<h2>Optimiser la Logistique Transfrontalière Canada–États-Unis</h2>
<p>Le commerce transfrontalier entre le Canada et les États-Unis continue d'évoluer à un rythme soutenu. Pour les expéditeurs de pièces automobiles, de machinerie et de biens de consommation, anticiper les réglementations numériques est primordial afin d'éviter les retards aux postes frontaliers.</p>

<div class="blog-annotation">
  <strong style="color: #0B2545; display: block; margin-bottom: 0.25rem;">📌 Note Réglementaire Clé :</strong>
  <p style="margin: 0; color: #334155;">Tous les importateurs commerciaux au Canada doivent s'assurer que leur compte portail client GCRA est dûment configuré et que leurs cautions financières sont actives avant l'arrivée du fret.</p>
</div>

<h3>1. Transition Numérique Complète de l'ASFC (GCRA)</h3>
<p>L'Agence des services frontaliers du Canada (ASFC) a complété son virage avec le système GCRA. Les transporteurs utilisant des <mark class="highlight-mark">manifestes électroniques pré-validés</mark> bénéficient de délais de passage moyens inférieurs à 15 minutes aux principaux points d'entrée.</p>

<h3>2. Meilleures Pratiques pour un Dédouanement Fluide</h3>
<ul>
  <li><strong>Documentation Synchronisée :</strong> Factures commerciales alignées sur les codes du Système Harmonisé (SH).</li>
  <li><strong>Télétransmission PARS / PAPS :</strong> Vérification systématique 2 heures avant l'arrivée physique du camion.</li>
  <li><strong>Garantie Financière Active :</strong> Couverture adéquate pour éviter toute retenue de marchandise.</li>
</ul>

<p>Pour un accompagnement douanier sur mesure, consultez notre <a href="https://transimex-canada.com/quote" target="_blank" rel="noopener noreferrer">portail de soumission en ligne</a>.</p>`,
    },
    metaTitle: {
      en: "Canadian Cross-Border Freight Regulations 2026 | Transimex",
      fr: "Réglementation Fret Transfrontalier Canadien 2026 | Transimex",
    },
    metaDescription: {
      en: "Master CBSA CARM mandates, PARS/PAPS customs clearance, and North American cross-border logistics with Transimex Canada expert guides.",
      fr: "Maîtrisez les exigences de l'ASFC GCRA, les manifestes PARS/PAPS et la logistique transfrontalière avec les experts de Transimex Canada.",
    },
    author: "Jean-Marc Bouchard, Lead Customs Specialist",
    category: "Customs & Compliance",
    featuredImage:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
    status: "Published",
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    tags: ["Cross-Border", "Customs", "CARM", "CBSA", "Freight"],
    views: 184,
    allowComments: true,
    commentsCount: 2,
    comments: [
      {
        authorName: "David Miller",
        authorEmail: "dmiller@logisticsfreight.ca",
        content:
          "Great explanation on the CARM transition! Does Transimex handle RPP (Release Prior to Payment) bonding directly for first-time Canadian importers?",
        status: "Approved",
        adminReply: {
          content:
            "Hello David, yes! Our licensed customs brokerage team assists cross-border shippers with full RPP financial security setup, bond delegation, and automated e-manifest filings.",
          repliedBy: "Transimex Logistics Editorial",
          repliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      },
      {
        authorName: "Élise Tremblay",
        authorEmail: "elise.tremblay@expeditionsmtl.com",
        content:
          "Très bon article. Avez-vous des recommandations spécifiques pour les expéditions de denrées périssables sous température dirigée ?",
        status: "Approved",
        adminReply: null, // Left unanswered so admin can test replying!
      },
    ],
  },
  {
    slug: "cold-chain-logistics-winter-corridors",
    title: {
      en: "Cold Chain Logistics: Safeguarding Reefer Cargo Across Extreme Winter Corridors",
      fr: "Logistique de la Chaîne du Froid : Protéger les Marchandises Réfrigérées Face aux Hivers Extrêmes",
    },
    excerpt: {
      en: "How continuous IoT telematics, multi-temp reefer trailers, and heated transport prevent freeze-damage across Canadian winter highway routes.",
      fr: "Comment la télématique IoT en temps réel, les remorques réfrigérées multi-températures et le transport chauffé préviennent le gel des cargaisons canadiennes.",
    },
    content: {
      en: `<h2>Protecting Perishable & Pharmaceutical Shipments in Sub-Zero Weather</h2>
<p>Canadian winters pose distinct challenges for temperature-sensitive freight. When outside ambient temperatures drop below -30°C across northern Ontario and the Prairies, refrigerated trailers are not just keeping cargo cool—they are actively heating to prevent catastrophic freezing.</p>

<div class="blog-annotation">
  <strong style="color: #0B2545; display: block; margin-bottom: 0.25rem;">📌 Cold Chain Operational Rule:</strong>
  <p style="margin: 0; color: #334155;">Food-grade and pharmaceutical cargo require verified Protect From Freezing (PFF) certified trailers with continuous satellite telematics logging every 10 minutes.</p>
</div>

<h3>Critical Safeguards in Reefer Operations</h3>
<ul>
  <li><mark class="highlight-mark">Dual-Fuel Carrier Units:</mark> Redundant power ensures uninterrupted continuous airflow throughout mountain passes.</li>
  <li><mark class="highlight-mark">Real-Time Telematics Alarms:</mark> Automated alerts notify dispatchers if cargo temperatures fluctuate by more than 1.5°C from setpoint.</li>
  <li><mark class="highlight-mark">Thermal Curtain Barriers:</mark> Multi-zone bulkhead insulation enables frozen (-20°C) and fresh (+4°C) goods in a single consolidated haul.</li>
</ul>

<p>Transimex Canada provides dedicated reefer fleets equipped with continuous temperature telemetry across all major provincial lanes.</p>`,
      fr: `<h2>Protéger les Cargaisons Périssables et Pharmaceutiques par Temps Glacial</h2>
<p>Les hivers canadiens imposent des exigences extrêmes pour le fret sous température dirigée. Lorsque les températures extérieures chutent sous les -30°C dans le nord de l'Ontario et les Prairies, les remorques réfrigérées chauffent activement pour empêcher le gel destructeur des marchandises.</p>

<div class="blog-annotation">
  <strong style="color: #0B2545; display: block; margin-bottom: 0.25rem;">📌 Règle Opérationnelle Chaîne du Froid :</strong>
  <p style="margin: 0; color: #334155;">Les cargaisons agroalimentaires et pharmaceutiques requièrent des remorques certifiées « Protection Contre le Gel » avec enregistrement télématique par satellite toutes les 10 minutes.</p>
</div>

<h3>Mesures de Protection Essentielles</h3>
<ul>
  <li><mark class="highlight-mark">Groupes Réfrigérés à Double Alimentation :</mark> Alimentation redondante garantissant un débit d'air constant dans les cols montagneux.</li>
  <li><mark class="highlight-mark">Alarmes Télématiques en Temps Réel :</mark> Alertes automatiques en cas d'écart thermique supérieur à 1,5°C par rapport à la consigne.</li>
  <li><mark class="highlight-mark">Cloisons Thermiques Isolantes :</mark> Transport combiné de produits surgelés (-20°C) et frais (+4°C) au sein d'un même voyage.</li>
</ul>

<p>Transimex Canada met à disposition une flotte spécialisée équipée de capteurs télématiques sur l'ensemble des corridors interprovinciaux.</p>`,
    },
    metaTitle: {
      en: "Cold Chain Logistics & Reefer Transport | Transimex Canada",
      fr: "Logistique Chaîne du Froid & Fret Réfrigéré | Transimex",
    },
    metaDescription: {
      en: "Protect sensitive reefer freight from sub-zero winter temperatures with Transimex Canada certified cold chain logistics and telematics.",
      fr: "Sécurisez vos expéditions réfrigérées et chauffées face aux rigueurs de l'hiver canadien grâce à Transimex Canada.",
    },
    author: "Sarah Jenkins, Cold Chain Operations",
    category: "Cold Chain & Reefer",
    featuredImage:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200",
    status: "Published",
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    tags: ["Cold Chain", "Reefer", "Pharmaceuticals", "Winter Logistics"],
    views: 126,
    allowComments: true,
    commentsCount: 1,
    comments: [
      {
        authorName: "Marc-André Fortin",
        authorEmail: "mafortin@agrifood.ca",
        content:
          "Fournissez-vous des rapports certifiés de température téléchargeables pour les audits d'assurance qualité HACCP ?",
        status: "Approved",
        adminReply: {
          content:
            "Absolument, Marc-André ! Tous nos chargements réfrigérés génèrent un journal PDF horodaté complet disponible directement via notre portail client Transimex.",
          repliedBy: "Transimex Logistics Editorial",
          repliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      },
    ],
  },
  {
    slug: "intermodal-freight-carbon-optimization",
    title: {
      en: "Intermodal Freight Optimization: Balancing Speed and Carbon Emissions",
      fr: "Optimisation du Fret Intermodal : Concilier Rapidité et Réduction des Émissions",
    },
    excerpt: {
      en: "Exploring the environmental and financial advantages of shifting long-haul freight from road to rail along the Vancouver–Montreal–Halifax corridor.",
      fr: "Explorer les avantages écologiques et économiques du transfert modal de la route vers le rail le long du corridor Vancouver–Montréal–Halifax.",
    },
    content: {
      en: `<h2>Sustainable Supply Chains Through Smart Intermodal Solutions</h2>
<p>With corporate ESG commitments and escalating fuel surcharges, shippers across Canada are increasingly evaluating intermodal rail transport as a strategic alternative to long-haul over-the-road trucking.</p>

<div class="blog-annotation">
  <strong style="color: #0B2545; display: block; margin-bottom: 0.25rem;">📌 Efficiency Metric:</strong>
  <p style="margin: 0; color: #334155;">Moving freight by rail reduces greenhouse gas emissions by up to 75% compared to long-haul truckload on corridors exceeding 1,200 kilometers.</p>
</div>

<h3>Strategic Intermodal Advantages</h3>
<ul>
  <li><strong>Fuel Surcharge Hedge:</strong> Rail economics provide greater predictability against diesel price volatility.</li>
  <li><strong>High-Capacity 53ft Containers:</strong> Standard domestic containers allow maximum cubic capacity utilization.</li>
  <li><strong>Integrated First & Last Mile Drayage:</strong> Local specialized drayage teams provide seamless dock-to-dock transitions.</li>
</ul>

<p>Contact our operations team to conduct an intermodal lane feasibility assessment for your primary shipping routes.</p>`,
      fr: `<h2>Des Chaînes d'Approvisionnement Durables Grâce à l'Intermodal</h2>
<p>Face aux engagements RSE et à la fluctuation des suppléments de carburant, les expéditeurs canadiens considèrent de plus en plus le rail comme une alternative stratégique au camionnage longue distance.</p>

<div class="blog-annotation">
  <strong style="color: #0B2545; display: block; margin-bottom: 0.25rem;">📌 Indicateur d'Efficacité :</strong>
  <p style="margin: 0; color: #334155;">Le transport ferroviaire réduit les émissions de gaz à effet de serre jusqu'à 75 % par rapport au camionnage complet sur les corridors de plus de 1 200 km.</p>
</div>

<h3>Avantages Clés du Fret Intermodal</h3>
<ul>
  <li><strong>Stabilité Tarifaire :</strong> Meilleure protection contre la volatilité du prix du diesel.</li>
  <li><strong>Conteneurs Domestiques 53 Pieds :</strong> Volume utile maximal pour les marchandises palettisées.</li>
  <li><strong>Desserte Locale et Camionnage Intégré :</strong> Prise en charge fluide du premier et dernier kilomètre.</li>
</ul>

<p>Contactez nos répartiteurs pour analyser la faisabilité intermodale de vos corridors réguliers.</p>`,
    },
    metaTitle: {
      en: "Intermodal Freight Rail Solutions | Transimex Canada",
      fr: "Solutions de Fret Intermodal & Rail | Transimex Canada",
    },
    metaDescription: {
      en: "Reduce freight emissions by up to 75% and optimize costs using Transimex Canada domestic rail and intermodal drayage networks.",
      fr: "Réduisez vos émissions de fret de 75 % et optimisez vos coûts logistiques avec le réseau intermodal de Transimex Canada.",
    },
    author: "Alexandre Tremblay, Supply Chain Strategist",
    category: "Intermodal & Rail",
    featuredImage:
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=1200",
    status: "Published",
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    tags: ["Intermodal", "Rail Freight", "Sustainability", "Supply Chain"],
    views: 95,
    allowComments: true,
    commentsCount: 0,
    comments: [],
  },
  {
    slug: "global-ocean-freight-market-outlook-2026",
    title: {
      en: "Global Ocean Freight Market Outlook: Demurrage & Detention Mitigation",
      fr: "Perspectives du Marché du Fret Maritime Mondial : Réduire les Surestaries",
    },
    excerpt: {
      en: "Proactive container tracking, inland port staging, and documentation workflows to avoid crippling port detention fees.",
      fr: "Suivi proactif des conteneurs maritimes, relais portuaires intérieurs et gestion documentaire pour éviter les surestaries.",
    },
    content: {
      en: `<h2>Mitigating Container Demurrage & Detention in Canadian Gateways</h2>
<p>Maritime ocean shipping through the Port of Montreal, Vancouver, and Halifax requires precise coordination to prevent demurrage charges from eroding shipment margins.</p>

<div class="blog-annotation">
  <strong style="color: #0B2545; display: block; margin-bottom: 0.25rem;">📌 Editorial Strategy Note:</strong>
  <p style="margin: 0; color: #334155;">Real-time automated container tracking combined with pre-assigned terminal pick-up appointments is the single most effective way to eliminate costly port storage penalties.</p>
</div>

<h3>Actionable Steps for Shippers</h3>
<ol>
  <li>Integrate direct API container tracking into your transport management workflows.</li>
  <li>Secure early customs releases prior to vessel arrival at marine berths.</li>
  <li>Coordinate off-dock container yards to stage empties during peak terminal congestion.</li>
</ol>`,
      fr: `<h2>Atténuer les Surestaries et la Détention dans les Ports Canadiens</h2>
<p>L'acheminement maritime via les ports de Montréal, Vancouver et Halifax exige une coordination millimétrée pour éviter que les surestaries n'entament vos marges.</p>

<div class="blog-annotation">
  <strong style="color: #0B2545; display: block; margin-bottom: 0.25rem;">📌 Recommandation Stratégique :</strong>
  <p style="margin: 0; color: #334155;">Le suivi automatisé en temps réel combiné à la réservation préalable des créneaux de ramassage terminal représente la méthode la plus efficace pour éliminer les frais de garde portuaire.</p>
</div>

<h3>Mesures Concrètes pour les Chargeurs</h3>
<ol>
  <li>Intégrer le suivi de conteneurs en temps réel dans votre planification opérationnelle.</li>
  <li>Obtenir les mainlevées douanières avant l'accostage du navire au terminal.</li>
  <li>Utiliser des dépôts extérieurs pour entreposer les conteneurs vides en période de congestion.</li>
</ol>`,
    },
    metaTitle: {
      en: "Ocean Freight Market Outlook & Demurrage Strategies | Transimex",
      fr: "Fret Maritime & Gestion des Surestaries | Transimex",
    },
    metaDescription: {
      en: "Proven maritime logistics strategies to minimize container detention and optimize shipping margins through Canadian port terminals.",
      fr: "Stratégies maritimes éprouvées pour minimiser les frais de surestaries et optimiser vos flux dans les ports canadiens.",
    },
    author: "Transimex Maritime Intelligence",
    category: "Maritime & Ocean Shipping",
    featuredImage:
      "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&q=80&w=1200",
    status: "Draft", // Draft post to test Draft filter
    publishedAt: undefined,
    tags: ["Ocean Shipping", "Maritime", "Demurrage", "Ports"],
    views: 12,
    allowComments: false, // Commenting disabled to test disabled state
    commentsCount: 0,
    comments: [],
  },
];

async function seed() {
  console.log("Connecting to MongoDB at:", MONGODB_URI ? "Connected to DB cluster" : "MISSING");
  await mongoose.connect(MONGODB_URI);

  const postsCollection = mongoose.connection.collection("blogposts");
  const commentsCollection = mongoose.connection.collection("blogcomments");

  console.log("Checking existing posts in database...");
  for (const item of samplePosts) {
    const existing = await postsCollection.findOne({ slug: item.slug });
    if (existing) {
      console.log(`Post with slug "${item.slug}" already exists. Updating...`);
      await postsCollection.updateOne(
        { slug: item.slug },
        {
          $set: {
            title: item.title,
            excerpt: item.excerpt,
            content: item.content,
            metaTitle: item.metaTitle,
            metaDescription: item.metaDescription,
            author: item.author,
            category: item.category,
            featuredImage: item.featuredImage,
            status: item.status,
            publishedAt: item.publishedAt,
            tags: item.tags,
            views: item.views,
            allowComments: item.allowComments,
            commentsCount: item.comments.length,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      console.log(`Inserting new post: "${item.title.en}"...`);
      const insertResult = await postsCollection.insertOne({
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt,
        content: item.content,
        metaTitle: item.metaTitle,
        metaDescription: item.metaDescription,
        author: item.author,
        category: item.category,
        featuredImage: item.featuredImage,
        status: item.status,
        publishedAt: item.publishedAt,
        tags: item.tags,
        views: item.views,
        allowComments: item.allowComments,
        commentsCount: item.comments.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const postId = insertResult.insertedId;

      // Insert comments if any
      if (item.comments && item.comments.length > 0) {
        for (const comm of item.comments) {
          await commentsCollection.insertOne({
            postId: postId,
            postSlug: item.slug,
            postTitle: item.title,
            authorName: comm.authorName,
            authorEmail: comm.authorEmail,
            content: comm.content,
            status: comm.status,
            adminReply: comm.adminReply
              ? {
                  content: comm.adminReply.content,
                  repliedBy: comm.adminReply.repliedBy,
                  repliedAt: comm.adminReply.repliedAt,
                }
              : { content: "", repliedBy: "", repliedAt: null },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
  }

  const finalPostsCount = await postsCollection.countDocuments();
  const finalCommentsCount = await commentsCollection.countDocuments();
  console.log(`✅ Seeding complete! Total Blog Posts in DB: ${finalPostsCount}, Total Comments in DB: ${finalCommentsCount}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
