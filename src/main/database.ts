import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

export const getDatabaseClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    })
  }
  return prisma
}

export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}

// User operations
export const findUserByEmail = async (email: string) => {
  const db = getDatabaseClient()
  return await db.user.findUnique({
    where: { email },
    include: {
      accounts: true,
      metadata: true,
    }
  })
}

export const createUser = async (userData: {
  email: string
  name?: string
  image?: string
}) => {
  const db = getDatabaseClient()
  return await db.user.create({
    data: {
      ...userData,
      metadata: {
        create: {
          totalMetadataGenerated: 0,
          totalExports: 0,
          lastActive: new Date(),
        }
      }
    },
    include: {
      accounts: true,
      metadata: true,
    }
  })
}

export const createOrUpdateAccount = async (accountData: {
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token?: string
  access_token?: string
  expires_at?: number
  token_type?: string
  scope?: string
  id_token?: string
  session_state?: string
}) => {
  const db = getDatabaseClient()
  return await db.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: accountData.provider,
        providerAccountId: accountData.providerAccountId
      }
    },
    update: accountData,
    create: accountData
  })
}

export const updateUserLastActive = async (userId: string) => {
  const db = getDatabaseClient()
  return await db.userMetadata.upsert({
    where: { userId },
    update: { lastActive: new Date() },
    create: {
      userId,
      totalMetadataGenerated: 0,
      totalExports: 0,
      lastActive: new Date()
    }
  })
}
