import { PrismaClient } from './app/generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:A12345fe@localhost:5432/barbershop?schema=public' }),
})

try {
  const rows = await prisma.blockedDay.findMany()
  console.log('OK', rows.length, 'rows')
} catch (e) {
  console.log('ERROR', e.code, e.message, JSON.stringify(e.meta))
} finally {
  await prisma.$disconnect()
}
