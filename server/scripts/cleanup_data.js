const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALLOWED_TYPES = [
  'Laminate Record for GSM Verification',
  'Packing Shift Report'
];

async function main() {
  console.log('--- Database Cleanup Started ---');
  
  const documentsToDelete = await prisma.document.findMany({
    where: {
      NOT: {
        type: {
          in: ALLOWED_TYPES
        }
      }
    }
  });

  console.log(`Found ${documentsToDelete.length} documents to delete.`);

  if (documentsToDelete.length > 0) {
    const docIds = documentsToDelete.map(d => d.id);
    
    // 1. Delete associated logs
    await prisma.documentWorkflowLog.deleteMany({
      where: {
        documentId: {
          in: docIds
        }
      }
    });
    console.log(`Deleted logs for ${docIds.length} documents.`);

    // 2. Delete documents
    const result = await prisma.document.deleteMany({
      where: {
        id: {
          in: docIds
        }
      }
    });
    console.log(`Successfully deleted ${result.count} documents.`);
  } else {
    console.log('No documents found to delete.');
  }

  console.log('--- Cleanup Completed ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
