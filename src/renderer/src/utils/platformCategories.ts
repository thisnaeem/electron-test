/**
 * Platform Categories and CSV Generation
 * 
 * Handles category selection and CSV generation for different stock platforms
 */

import { MetadataResult } from '../context/GeminiContext.types'

export interface AdobeStockCategory {
  id: number
  name: string
}

export interface ShutterstockCategory {
  id: number
  name: string
}

export interface DreamstimeCategory {
  id: number
  name: string
  parent: string
}

// Platform-specific categories
export const DREAMSTIME_CATEGORIES: DreamstimeCategory[] = [
  { id: 211, name: "Aerial", parent: "Abstract" },
  { id: 112, name: "Backgrounds", parent: "Abstract" },
  { id: 39, name: "Blurs", parent: "Abstract" },
  { id: 164, name: "Colors", parent: "Abstract" },
  { id: 40, name: "Competition", parent: "Abstract" },
  { id: 41, name: "Craftsmanship", parent: "Abstract" },
  { id: 42, name: "Danger", parent: "Abstract" },
  { id: 43, name: "Exploration", parent: "Abstract" },
  { id: 158, name: "Fun", parent: "Abstract" },
  { id: 44, name: "Help", parent: "Abstract" },
  { id: 149, name: "Love", parent: "Abstract" },
  { id: 45, name: "Luxury", parent: "Abstract" },
  { id: 187, name: "Mobile", parent: "Abstract" },
  { id: 46, name: "Peace", parent: "Abstract" },
  { id: 165, name: "Planetarium", parent: "Abstract" },
  { id: 47, name: "Power", parent: "Abstract" },
  { id: 48, name: "Purity", parent: "Abstract" },
  { id: 128, name: "Religion", parent: "Abstract" },
  { id: 155, name: "Seasonal & Holiday", parent: "Abstract" },
  { id: 49, name: "Security", parent: "Abstract" },
  { id: 50, name: "Sports", parent: "Abstract" },
  { id: 51, name: "Stress", parent: "Abstract" },
  { id: 52, name: "Success", parent: "Abstract" },
  { id: 53, name: "Teamwork", parent: "Abstract" },
  { id: 141, name: "Textures", parent: "Abstract" },
  { id: 54, name: "Unique", parent: "Abstract" },
  { id: 31, name: "Birds", parent: "Animals" },
  { id: 33, name: "Farm", parent: "Animals" },
  { id: 36, name: "Insects", parent: "Animals" },
  { id: 32, name: "Mammals", parent: "Animals" },
  { id: 34, name: "Marine life", parent: "Animals" },
  { id: 30, name: "Pets", parent: "Animals" },
  { id: 35, name: "Reptiles & Amphibians", parent: "Animals" },
  { id: 37, name: "Rodents", parent: "Animals" },
  { id: 168, name: "Wildlife", parent: "Animals" },
  { id: 124, name: "Details", parent: "Arts & Architecture" },
  { id: 71, name: "Generic architecture", parent: "Arts & Architecture" },
  { id: 132, name: "Historic buildings", parent: "Arts & Architecture" },
  { id: 153, name: "Home", parent: "Arts & Architecture" },
  { id: 73, name: "Indoor", parent: "Arts & Architecture" },
  { id: 70, name: "Landmarks", parent: "Arts & Architecture" },
  { id: 131, name: "Modern buildings", parent: "Arts & Architecture" },
  { id: 130, name: "Night scenes", parent: "Arts & Architecture" },
  { id: 72, name: "Outdoor", parent: "Arts & Architecture" },
  { id: 174, name: "Ruins & Ancient", parent: "Arts & Architecture" },
  { id: 154, name: "Work places", parent: "Arts & Architecture" },
  { id: 79, name: "Communications", parent: "Business" },
  { id: 78, name: "Computers", parent: "Business" },
  { id: 80, name: "Finance", parent: "Business" },
  { id: 77, name: "Industries", parent: "Business" },
  { id: 83, name: "Metaphors", parent: "Business" },
  { id: 84, name: "Objects", parent: "Business" },
  { id: 75, name: "People", parent: "Business" },
  { id: 81, name: "Still-life", parent: "Business" },
  { id: 76, name: "Teams", parent: "Business" },
  { id: 82, name: "Transportation", parent: "Business" },
  { id: 85, name: "Travel", parent: "Business" },
  { id: 178, name: "Celebrities", parent: "Editorial" },
  { id: 185, name: "Commercial", parent: "Editorial" },
  { id: 179, name: "Events", parent: "Editorial" },
  { id: 184, name: "Landmarks", parent: "Editorial" },
  { id: 180, name: "People", parent: "Editorial" },
  { id: 181, name: "Politics", parent: "Editorial" },
  { id: 182, name: "Sports", parent: "Editorial" },
  { id: 183, name: "Weather & Environment", parent: "Editorial" },
  { id: 204, name: "Chinese New Year", parent: "Holidays" },
  { id: 190, name: "Christmas", parent: "Holidays" },
  { id: 207, name: "Cinco de Mayo", parent: "Holidays" },
  { id: 203, name: "Diwali", parent: "Holidays" },
  { id: 193, name: "Easter", parent: "Holidays" },
  { id: 196, name: "Fathers Day", parent: "Holidays" },
  { id: 192, name: "Halloween", parent: "Holidays" },
  { id: 208, name: "Hanukkah", parent: "Holidays" },
  { id: 206, name: "Mardi Gras", parent: "Holidays" },
  { id: 195, name: "Mothers Day", parent: "Holidays" },
  { id: 189, name: "New Years", parent: "Holidays" },
  { id: 202, name: "Other", parent: "Holidays" },
  { id: 205, name: "Ramadan", parent: "Holidays" },
  { id: 191, name: "Thanksgiving", parent: "Holidays" },
  { id: 194, name: "Valentines Day", parent: "Holidays" },
  { id: 210, name: "Artificial Intelligence", parent: "IT & C" },
  { id: 110, name: "Connectivity", parent: "IT & C" },
  { id: 113, name: "Equipment", parent: "IT & C" },
  { id: 111, name: "Internet", parent: "IT & C" },
  { id: 109, name: "Networking", parent: "IT & C" },
  { id: 212, name: "AI generated", parent: "Illustrations & Clipart" },
  { id: 166, name: "3D & Computer generated", parent: "Illustrations & Clipart" },
  { id: 167, name: "Hand drawn & Artistic", parent: "Illustrations & Clipart" },
  { id: 163, name: "Illustrations", parent: "Illustrations & Clipart" },
  { id: 186, name: "Vector", parent: "Illustrations & Clipart" },
  { id: 101, name: "Agriculture", parent: "Industries" },
  { id: 89, name: "Architecture", parent: "Industries" },
  { id: 87, name: "Banking", parent: "Industries" },
  { id: 93, name: "Cargo & Shipping", parent: "Industries" },
  { id: 94, name: "Communications", parent: "Industries" },
  { id: 91, name: "Computers", parent: "Industries" },
  { id: 90, name: "Construction", parent: "Industries" },
  { id: 150, name: "Education", parent: "Industries" },
  { id: 136, name: "Entertainment", parent: "Industries" },
  { id: 99, name: "Environment", parent: "Industries" },
  { id: 127, name: "Food & Beverages", parent: "Industries" },
  { id: 92, name: "Healthcare & Medical", parent: "Industries" },
  { id: 96, name: "Insurance", parent: "Industries" },
  { id: 95, name: "Legal", parent: "Industries" },
  { id: 100, name: "Manufacturing", parent: "Industries" },
  { id: 102, name: "Military", parent: "Industries" },
  { id: 161, name: "Oil and gas", parent: "Industries" },
  { id: 97, name: "Power and energy", parent: "Industries" },
  { id: 157, name: "Sports", parent: "Industries" },
  { id: 98, name: "Transportation", parent: "Industries" },
  { id: 88, name: "Travel", parent: "Industries" },
  { id: 22, name: "Clouds and skies", parent: "Nature" },
  { id: 17, name: "Deserts", parent: "Nature" },
  { id: 14, name: "Details", parent: "Nature" },
  { id: 27, name: "Fields & Meadows", parent: "Nature" },
  { id: 25, name: "Flowers & Gardens", parent: "Nature" },
  { id: 28, name: "Food ingredients", parent: "Nature" },
  { id: 18, name: "Forests", parent: "Nature" },
  { id: 137, name: "Fruits & Vegetables", parent: "Nature" },
  { id: 11, name: "Generic vegetation", parent: "Nature" },
  { id: 143, name: "Geologic and mineral", parent: "Nature" },
  { id: 16, name: "Lakes and rivers", parent: "Nature" },
  { id: 146, name: "Landscapes", parent: "Nature" },
  { id: 15, name: "Mountains", parent: "Nature" },
  { id: 12, name: "Plants and trees", parent: "Nature" },
  { id: 19, name: "Sea & Ocean", parent: "Nature" },
  { id: 26, name: "Seasons specific", parent: "Nature" },
  { id: 23, name: "Sunsets & Sunrises", parent: "Nature" },
  { id: 20, name: "Tropical", parent: "Nature" },
  { id: 171, name: "Water", parent: "Nature" },
  { id: 24, name: "Waterfalls", parent: "Nature" },
  { id: 142, name: "Clothing & Accessories", parent: "Objects" },
  { id: 147, name: "Electronics", parent: "Objects" },
  { id: 138, name: "Home related", parent: "Objects" },
  { id: 135, name: "Isolated", parent: "Objects" },
  { id: 151, name: "Music and sound", parent: "Objects" },
  { id: 145, name: "Other", parent: "Objects" },
  { id: 152, name: "Retro", parent: "Objects" },
  { id: 156, name: "Sports", parent: "Objects" },
  { id: 144, name: "Still life", parent: "Objects" },
  { id: 140, name: "Tools", parent: "Objects" },
  { id: 134, name: "Toys", parent: "Objects" },
  { id: 123, name: "Active", parent: "People" },
  { id: 139, name: "Body parts", parent: "People" },
  { id: 119, name: "Children", parent: "People" },
  { id: 175, name: "Cosmetic & Makeup", parent: "People" },
  { id: 115, name: "Couples", parent: "People" },
  { id: 122, name: "Diversity", parent: "People" },
  { id: 159, name: "Expressions", parent: "People" },
  { id: 118, name: "Families", parent: "People" },
  { id: 117, name: "Men", parent: "People" },
  { id: 173, name: "Nudes", parent: "People" },
  { id: 162, name: "Portraits", parent: "People" },
  { id: 121, name: "Seniors", parent: "People" },
  { id: 120, name: "Teens", parent: "People" },
  { id: 116, name: "Women", parent: "People" },
  { id: 160, name: "Workers", parent: "People" },
  { id: 105, name: "Computers", parent: "Technology" },
  { id: 106, name: "Connections", parent: "Technology" },
  { id: 129, name: "Electronics", parent: "Technology" },
  { id: 148, name: "Other", parent: "Technology" },
  { id: 107, name: "Retro", parent: "Technology" },
  { id: 209, name: "Science", parent: "Technology" },
  { id: 104, name: "Telecommunications", parent: "Technology" },
  { id: 56, name: "Africa", parent: "Travel" },
  { id: 58, name: "America", parent: "Travel" },
  { id: 176, name: "Antarctica", parent: "Travel" },
  { id: 65, name: "Arts & Architecture", parent: "Travel" },
  { id: 57, name: "Asia", parent: "Travel" },
  { id: 60, name: "Australasian", parent: "Travel" },
  { id: 62, name: "Cruise", parent: "Travel" },
  { id: 63, name: "Cuisine", parent: "Travel" },
  { id: 67, name: "Currencies", parent: "Travel" },
  { id: 61, name: "Destination scenics", parent: "Travel" },
  { id: 59, name: "Europe", parent: "Travel" },
  { id: 68, name: "Flags", parent: "Travel" },
  { id: 64, name: "Resorts", parent: "Travel" },
  { id: 66, name: "Tropical", parent: "Travel" },
  { id: 201, name: "Banners", parent: "Web Design Graphics" },
  { id: 200, name: "Buttons", parent: "Web Design Graphics" },
  { id: 199, name: "Web Backgrounds & Textures", parent: "Web Design Graphics" },
  { id: 198, name: "Web Icons", parent: "Web Design Graphics" }
]

export const ADOBE_STOCK_CATEGORIES: AdobeStockCategory[] = [
  { id: 1, name: "Animals" },
  { id: 2, name: "Buildings and Architecture" },
  { id: 3, name: "Business" },
  { id: 4, name: "Drinks" },
  { id: 5, name: "The Environment" },
  { id: 6, name: "States of Mind" },
  { id: 7, name: "Food" },
  { id: 8, name: "Graphic Resources" },
  { id: 9, name: "Hobbies and Leisure" },
  { id: 10, name: "Industry" },
  { id: 11, name: "Landscape" },
  { id: 12, name: "Lifestyle" },
  { id: 13, name: "People" },
  { id: 14, name: "Plants and Flowers" },
  { id: 15, name: "Culture and Religion" },
  { id: 16, name: "Science" },
  { id: 17, name: "Social Issues" },
  { id: 18, name: "Sports" },
  { id: 19, name: "Technology" },
  { id: 20, name: "Transport" },
  { id: 21, name: "Travel" },
]

export const SHUTTERSTOCK_CATEGORIES: ShutterstockCategory[] = [
  { id: 1, name: "Abstract" },
  { id: 2, name: "Animals/Wildlife" },
  { id: 3, name: "Arts" },
  { id: 4, name: "Backgrounds/Textures" },
  { id: 5, name: "Beauty/Fashion" },
  { id: 6, name: "Buildings/Landmarks" },
  { id: 7, name: "Business/Finance" },
  { id: 8, name: "Celebrities" },
  { id: 9, name: "Education" },
  { id: 10, name: "Food and Drink" },
  { id: 11, name: "Healthcare/Medical" },
  { id: 12, name: "Holidays" },
  { id: 13, name: "Industrial" },
  { id: 14, name: "Interiors" },
  { id: 15, name: "Miscellaneous" },
  { id: 16, name: "Nature" },
  { id: 17, name: "Objects" },
  { id: 18, name: "Parks/Outdoor" },
  { id: 19, name: "People" },
  { id: 20, name: "Religion" },
  { id: 21, name: "Science" },
  { id: 22, name: "Signs/Symbols" },
  { id: 23, name: "Sports/Recreation" },
  { id: 24, name: "Technology" },
  { id: 25, name: "Transportation" },
  { id: 26, name: "Vintage" },
]

export const AI_MODELS = [
  "Adobe Firefly",
  "Dall-e 1",
  "Dall-e 2",
  "Dall-e 3",
  "Freepik Pikaso",
  "Ideogram 1.0",
  "Leonardo",
  "Midjourney 1",
  "Midjourney 2",
  "Midjourney 3",
  "Midjourney 4",
  "Midjourney 5",
  "Midjourney 5.1",
  "Midjourney 5.2",
  "Midjourney 6",
  "Stable Diffusion 1.4",
  "Stable Diffusion 1.5",
  "Stable Diffusion 2.0",
  "Stable Diffusion 2.1",
  "Stable Diffusion XL",
  "Wepik",
]

interface PlatformOptions {
  freepik?: {
    isAiGenerated: boolean
    aiModel?: string
  }
  "123rf"?: {
    country: string
  }
  canva?: {
    artistName: string
  }
  dreamstime?: {
    isAiGenerated: boolean
    isFree: boolean
    isEditorial: boolean
    categories?: number[]
  }
  shutterstock?: {
    categories?: number[]
  }
  adobe?: {
    category?: number
  }
}

/**
 * Automatically select Dreamstime categories based on image metadata
 */
export function selectDreamstimeCategories(
  metadata: MetadataResult & { platformOptions?: any }
): number[] {
  // Check if categories are manually selected
  if (metadata.platformOptions?.dreamstime?.categories?.length > 0) {
    return metadata.platformOptions.dreamstime.categories
  }

  // If AI generated, force the first category to be 212 (AI generated)
  const isAiGenerated = metadata.platformOptions?.dreamstime?.isAiGenerated === true
  const combinedText = `${metadata.title} ${metadata.description || ''} ${metadata.keywords.join(" ")}`.toLowerCase()

  // Score each category based on keyword matches
  const scoredCategories = DREAMSTIME_CATEGORIES.map((category) => {
    // Skip AI generated category unless it's explicitly enabled
    if (category.id === 212 && !isAiGenerated) {
      return { category, score: -1 }
    }

    let score = 0

    // Check for category name match
    if (combinedText.includes(category.name.toLowerCase())) {
      score += 3
    }

    // Check for parent category match
    if (combinedText.includes(category.parent.toLowerCase())) {
      score += 2
    }

    return { category, score }
  })

  // Sort by score and get top categories
  let selectedCategories = scoredCategories
    .filter(item => item.score > -1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.category.id)

  // If no categories matched, use default categories
  if (selectedCategories.length === 0) {
    selectedCategories = [141, 112, 164] // Textures, Backgrounds, Colors
  }

  // If AI generated, ensure 212 is the first category
  if (isAiGenerated) {
    if (!selectedCategories.includes(212)) {
      selectedCategories = [212, ...selectedCategories.slice(0, 2)]
    }
  }

  return selectedCategories
}

/**
 * Automatically select Shutterstock categories based on image metadata
 */
export function selectShutterstockCategories(metadata: MetadataResult): number[] {
  const combinedText = `${metadata.title} ${metadata.description || ''} ${metadata.keywords.join(" ")}`.toLowerCase()

  // Score each category based on keyword matches
  const scoredCategories = SHUTTERSTOCK_CATEGORIES.map((category) => {
    let score = 0
    const categoryName = category.name.toLowerCase()

    // Check for exact category name match
    if (combinedText.includes(categoryName)) {
      score += 3
    }

    // Check for partial matches
    const categoryWords = categoryName.split(/[\/\s-]/).filter(Boolean)
    categoryWords.forEach((word) => {
      if (combinedText.includes(word)) {
        score += 1
      }
    })

    return { category, score }
  })

  // Sort by score and get top 2 categories
  const topCategories = scoredCategories
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.category.id)

  // If no categories matched, return default categories
  return topCategories.length > 0 ? topCategories : [1, 4] // Abstract and Backgrounds/Textures as fallback
}

/**
 * Automatically select Adobe Stock category based on image metadata
 */
export function selectAdobeStockCategory(metadata: MetadataResult): number {
  const combinedText = `${metadata.title} ${metadata.description || ''} ${metadata.keywords.join(" ")}`.toLowerCase()

  // Score each category based on keyword matches
  const scoredCategories = ADOBE_STOCK_CATEGORIES.map((category) => {
    let score = 0
    const categoryName = category.name.toLowerCase()

    // Check for exact category name match
    if (combinedText.includes(categoryName)) {
      score += 3
    }

    // Check for partial matches
    const categoryWords = categoryName.split(/[\/\s-]/).filter(Boolean)
    categoryWords.forEach((word) => {
      if (combinedText.includes(word)) {
        score += 1
      }
    })

    return { category, score }
  })

  // Sort by score and get top category
  const topCategory = scoredCategories
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]

  // If no category matched, return default category
  return topCategory ? topCategory.category.id : 8 // Graphic Resources as fallback
}

/**
 * Generate platform-specific CSV content
 */
export function generatePlatformCSV(
  metadata: Record<string, MetadataResult>,
  platform: string,
  options?: PlatformOptions
): string {
  const rows: string[][] = []

  switch (platform) {
    case "adobe-stock":
      rows.push(["Filename", "Title", "Keywords", "Category"])
      Object.entries(metadata).forEach(([filename, data]) => {
        // Get category ID from options or auto-select
        const categoryId = options?.adobe?.category || selectAdobeStockCategory(data)
        rows.push([
          filename,
          data.title,
          data.keywords.join(","),
          categoryId.toString(),
        ])
      })
      break

    case "shutterstock":
      rows.push([
        "Filename",
        "Title",
        "Description",
        "Keywords",
        "Category 1",
        "Category 2",
      ])
      Object.entries(metadata).forEach(([filename, data]) => {
        const categories = options?.shutterstock?.categories || selectShutterstockCategories(data)
        rows.push([
          filename,
          data.title,
          data.description || '',
          data.keywords.join(","),
          categories[0]?.toString() || "1",
          categories[1]?.toString() || "2",
        ])
      })
      break

    case "dreamstime":
      rows.push([
        "Filename",
        "Image Name",
        "Description",
        "Category 1",
        "Category 2",
        "Category 3",
        "Keywords",
        "Free",
        "W-EL",
        "P-EL",
        "SR-EL",
        "SR-Price",
        "Editorial",
        "MR doc Ids",
        "Pr Docs",
      ])
      Object.entries(metadata).forEach(([filename, data]) => {
        const categories = selectDreamstimeCategories({ ...data, platformOptions: { dreamstime: options?.dreamstime } })
        // Explicitly check for true values
        const isFree = options?.dreamstime?.isFree === true ? "1" : "0"
        const isEditorial = options?.dreamstime?.isEditorial === true ? "1" : "0"
        rows.push([
          filename,
          data.title,
          data.description || '',
          categories[0]?.toString() || "",
          categories[1]?.toString() || "",
          categories[2]?.toString() || "",
          data.keywords.join(","),
          isFree,
          "0",
          "0",
          "0",
          "0",
          isEditorial,
          "",
          "0",
        ])
      })
      break

    default:
      // For other platforms, use the existing logic
      rows.push(["Filename", "Title", "Keywords", "Description"])
      Object.entries(metadata).forEach(([filename, data]) => {
        rows.push([
          filename,
          data.title,
          data.keywords.join(","),
          data.description || '',
        ])
      })
  }

  // Convert rows to CSV string with proper escaping
  return rows.map((row) =>
    row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
  ).join("\n")
}