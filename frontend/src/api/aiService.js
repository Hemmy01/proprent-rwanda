/**
 * Mock AI Service — simulates an AI API backend.
 * Replace the internals with real API calls (OpenAI, AWS Bedrock, etc.) when ready.
 */

const MOCK_DELAY = 800 // ms — simulates network latency

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Price Estimation AI ────────────────────────────────────────────────────────
export async function estimatePrice({ price, sizeM2, propertyType, listingType, location, comparables = [] }) {
  await sleep(MOCK_DELAY)

  let estimated
  if (comparables.length >= 2) {
    const avgPricePerSqm = comparables.reduce((s, p) => s + p.price / (p.sizeM2 || 1), 0) / comparables.length
    estimated = Math.round(avgPricePerSqm * sizeM2)
  } else {
    // Fallback: apply location & type multipliers
    const locationMultiplier = location?.toLowerCase().includes('kigali') ? 1.15
      : location?.toLowerCase().includes('musanze') ? 0.85
      : location?.toLowerCase().includes('rubavu') ? 0.9
      : 1.0
    const typeMultiplier = propertyType === 'Commercial' ? 1.3
      : propertyType === 'House' ? 1.1
      : propertyType === 'Studio' ? 0.85
      : 1.0
    const baseRate = listingType === 'rent' ? 3500 : 450000 // RWF per m²
    estimated = Math.round(baseRate * sizeM2 * locationMultiplier * typeMultiplier)
  }

  const diff = ((price - estimated) / estimated) * 100
  let verdict, verdictClass, explanation

  if (Math.abs(diff) <= 10) {
    verdict = 'Fair Market Price'
    verdictClass = 'verdict-fair'
    explanation = `This property is priced within 10% of the estimated market value for similar ${propertyType?.toLowerCase()}s in ${location || 'this area'}.`
  } else if (diff > 10) {
    verdict = `${Math.round(diff)}% Above Market`
    verdictClass = 'verdict-high'
    explanation = `This property is priced ${Math.round(diff)}% above the estimated market value. You may have room to negotiate.`
  } else {
    verdict = `${Math.round(Math.abs(diff))}% Below Market`
    verdictClass = 'verdict-low'
    explanation = `This property is priced ${Math.round(Math.abs(diff))}% below the estimated market value — potentially a great deal!`
  }

  return { estimated, verdict, verdictClass, explanation, confidence: comparables.length >= 2 ? 'high' : 'medium' }
}

// ── Smart Matching AI ──────────────────────────────────────────────────────────
export function computeMatchScore(property, prefs) {
  if (!prefs) return null
  let score = 0
  let reasons = []

  if (!prefs.listingType || property.listingType === prefs.listingType) {
    score += 30
    if (prefs.listingType) reasons.push(`Matches your ${prefs.listingType} preference`)
  }
  if (!prefs.propertyType || property.propertyType === prefs.propertyType) {
    score += 20
    if (prefs.propertyType) reasons.push(`${prefs.propertyType} type match`)
  }
  if (prefs.maxPrice) {
    if (property.price <= prefs.maxPrice) { score += 25; reasons.push('Within your budget') }
    else if (property.price <= prefs.maxPrice * 1.2) { score += 12; reasons.push('Slightly over budget') }
  } else {
    score += 25
  }
  if (!prefs.minBedrooms || property.bedrooms >= prefs.minBedrooms) {
    score += 15
    if (prefs.minBedrooms) reasons.push(`${property.bedrooms} bedrooms meets your minimum`)
  }
  if (prefs.preferredLocation && property.location?.toLowerCase().includes(prefs.preferredLocation.toLowerCase())) {
    score += 10
    reasons.push(`Located in ${prefs.preferredLocation}`)
  } else if (!prefs.preferredLocation) {
    score += 10
  }

  return { score, reasons }
}

// ── PropBot AI Chat ────────────────────────────────────────────────────────────
export async function getAiReply(userMessage, context = {}) {
  await sleep(MOCK_DELAY)

  const q = userMessage.toLowerCase().trim()
  const { properties = [], prefs = null } = context

  // Greetings
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)/.test(q)) {
    return {
      text: "Hello! I'm PropBot, your AI property assistant for PropRent Rwanda 🏠\n\nI can help you:\n• Find properties by location or type\n• Explain AI matching & price estimation\n• Answer questions about renting or buying\n\nWhat are you looking for today?"
    }
  }

  // How it works
  if (q.includes('how') && (q.includes('work') || q.includes('use') || q.includes('start'))) {
    return {
      text: "Here's how PropRent works:\n\n1️⃣ Browse listings on the Properties page\n2️⃣ Enable AI Matching to get personalised rankings\n3️⃣ Open any property to see the AI Price Estimator\n4️⃣ Apply to rent or enquire to buy directly online\n5️⃣ Track your applications in your Dashboard\n\nWant to start browsing?",
      action: { label: 'Browse Properties', path: '/properties' }
    }
  }

  // AI features
  if (q.includes('ai') || q.includes('smart match') || q.includes('recommend')) {
    return {
      text: "PropRent has 3 AI-powered features:\n\n🎯 Smart Matching — ranks every listing based on your budget, location, type & bedrooms preferences\n\n💰 Price Estimator — tells you if a property is fairly priced vs market value\n\n🤖 PropBot (that's me!) — answers your questions and helps you find properties\n\nWant to enable AI Matching?",
      action: { label: 'Enable AI Matching', path: '/properties?ai=match' }
    }
  }

  // Price estimator
  if (q.includes('estimat') || q.includes('fair price') || q.includes('market price') || q.includes('worth') || q.includes('overpriced')) {
    return {
      text: "Our AI Price Estimator analyses similar properties in the same area and tells you:\n\n✅ Fair Market Price — within 10% of market value\n⚠️ Above Market — you may be able to negotiate\n🔥 Below Market — potentially a great deal!\n\nOpen any property listing and click 'Estimate Fair Price' on the right panel.",
      action: { label: 'Browse Properties', path: '/properties' }
    }
  }

  // Rent vs buy
  if ((q.includes('rent') && q.includes('buy')) || q.includes('rent or') || q.includes('buy or') || q.includes('should i rent') || q.includes('should i buy')) {
    return {
      text: "Great question! Here's a quick guide:\n\n🏠 Renting is better if:\n• You need flexibility\n• You're new to an area\n• You prefer lower upfront costs\n\n🏡 Buying is better if:\n• You're settling long-term\n• You want to build equity\n• Rwanda's growing market is your investment\n\nWhat would you like to explore?",
      actions: [
        { label: 'For Rent', path: '/properties?listing=rent' },
        { label: 'For Sale', path: '/properties?listing=sale' }
      ]
    }
  }

  // Application process
  if (q.includes('apply') || q.includes('application') || q.includes('how to apply') || q.includes('submit')) {
    return {
      text: "Applying for a property is simple:\n\n1. Open the property listing\n2. Click 'Apply to Rent' or 'Enquire to Buy'\n3. Add a message and preferred viewing date\n4. Submit — the agent reviews within 24hrs\n5. Track status in your Dashboard\n\nYou need to be logged in to apply.",
      action: { label: 'Browse Properties', path: '/properties' }
    }
  }

  // Contact / agent
  if (q.includes('contact') || q.includes('agent') || q.includes('call') || q.includes('phone') || q.includes('email')) {
    return {
      text: "You can contact agents directly from any property listing:\n\n📞 Click 'Call Agent' for direct phone contact\n✉️ Use the enquiry form to send a message\n\nGeneral enquiries:\n📧 info@proprent.rw\n📞 +250 788 000 123\n\nOur team is available Mon–Sat, 8am–6pm."
    }
  }

  // Neighbourhood / location info
  if (q.includes('neighbourhood') || q.includes('area') || q.includes('location') || q.includes('where')) {
    return {
      text: "Popular areas in Rwanda for property:\n\n🏙️ Kigali — business hub, highest demand & prices\n🌄 Musanze — near Volcanoes NP, growing fast\n🌊 Rubavu — Lake Kivu views, tourism hotspot\n🎓 Huye — university city, affordable rentals\n🌾 Nyagatare — Eastern Province, spacious properties\n\nWhich area interests you?",
      actions: [
        { label: 'Kigali', path: '/properties?q=kigali' },
        { label: 'Musanze', path: '/properties?q=musanze' },
        { label: 'Rubavu', path: '/properties?q=rubavu' }
      ]
    }
  }

  // Budget / price questions
  if (q.includes('cheap') || q.includes('afford') || q.includes('budget') || q.includes('low price') || q.includes('expensive')) {
    return {
      text: "Typical price ranges in Rwanda:\n\n🏠 Rentals:\n• Studio: 80,000–200,000 RWF/mo\n• 1-bed: 150,000–400,000 RWF/mo\n• 2-bed: 250,000–700,000 RWF/mo\n• 3-bed: 400,000–1,500,000 RWF/mo\n\n🏡 For Sale:\n• Apartment: 15M–80M RWF\n• House: 30M–200M+ RWF\n\nWant to filter by your budget?",
      action: { label: 'Browse by Price', path: '/properties' }
    }
  }

  // Specific cities
  const cities = ['kigali', 'musanze', 'rubavu', 'huye', 'nyagatare', 'muhanga', 'rwamagana']
  const city = cities.find(c => q.includes(c))
  if (city) {
    const cityName = city.charAt(0).toUpperCase() + city.slice(1)
    const cityProps = properties.filter(p => p.location?.toLowerCase().includes(city)).slice(0, 3)
    if (cityProps.length > 0) {
      const list = cityProps.map(p => `• ${p.title} — ${new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(p.price)}${p.listingType === 'rent' ? '/mo' : ''}`).join('\n')
      return {
        text: `Here are available properties in ${cityName}:\n\n${list}\n\nSee all results?`,
        action: { label: `Search ${cityName}`, path: `/properties?q=${city}` }
      }
    }
    return {
      text: `I'll search for properties in ${cityName} for you!`,
      action: { label: `Search ${cityName}`, path: `/properties?q=${city}` }
    }
  }

  // Rent listings
  if (q.includes('rent') || q.includes('rental')) {
    const rentals = properties.filter(p => p.listingType === 'rent').slice(0, 3)
    if (rentals.length > 0) {
      const list = rentals.map(p => `• ${p.title} — ${new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(p.price)}/mo (${p.location})`).join('\n')
      return { text: `Here are some available rentals:\n\n${list}`, action: { label: 'View All Rentals', path: '/properties?listing=rent' } }
    }
    return { text: 'Browse our rental listings here.', action: { label: 'View Rentals', path: '/properties?listing=rent' } }
  }

  // Sale listings
  if (q.includes('buy') || q.includes('sale') || q.includes('purchase') || q.includes('invest')) {
    const sales = properties.filter(p => p.listingType === 'sale').slice(0, 3)
    if (sales.length > 0) {
      const list = sales.map(p => `• ${p.title} — ${new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(p.price)} (${p.location})`).join('\n')
      return { text: `Here are some properties for sale:\n\n${list}`, action: { label: 'View All For Sale', path: '/properties?listing=sale' } }
    }
    return { text: 'Browse properties for sale here.', action: { label: 'For Sale', path: '/properties?listing=sale' } }
  }

  // Fallback
  return {
    text: "I'm not sure about that, but I'm here to help! Try asking:\n\n• 'Show rentals in Kigali'\n• 'What's the cheapest apartment?'\n• 'How does AI matching work?'\n• 'Should I rent or buy?'\n• 'How do I apply for a property?'"
  }
}
