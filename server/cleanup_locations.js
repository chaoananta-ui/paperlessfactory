const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allowedLocations = ['SHED NO 1', 'SHED NO 2', 'SHED NO 3'];
  
  // Find invalid documents first
  const invalidDocs = await prisma.document.findMany({
    where: {
      location: {
        notIn: allowedLocations
      }
    },
    select: { id: true }
  });

  const invalidDocIds = invalidDocs.map(d => d.id);

  if (invalidDocIds.length > 0) {
    // Delete logs first
    await prisma.documentWorkflowLog.deleteMany({
      where: {
        documentId: {
          in: invalidDocIds
        }
      }
    });

    // Then delete documents
    const deleted = await prisma.document.deleteMany({
      where: {
        id: {
          in: invalidDocIds
        }
      }
    });

    console.log(`Deleted ${deleted.count} documents and their logs with invalid locations.`);
  } else {
    console.log('No documents with invalid locations found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
