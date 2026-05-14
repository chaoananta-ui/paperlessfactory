const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Generating Dummy Data for Each Shed ---');

  const admin = await prisma.user.findUnique({ where: { username: 'admin1' } });
  if (!admin) {
    console.error('Admin user not found. Please run the seed first.');
    return;
  }

  const sheds = ['SHED NO 1', 'SHED NO 2', 'SHED NO 3'];
  const now = new Date();

  for (const shed of sheds) {
    console.log(`Creating data for ${shed}...`);

    // 1. Create a Laminate GSM Record
    await prisma.document.create({
      data: {
        type: 'Laminate Record for GSM Verification',
        location: shed,
        itemName: 'Laminate Film',
        status: 'Pending at Checked By',
        createdById: admin.id,
        data: JSON.stringify({
          date: now.toISOString().split('T')[0],
          shift: 'A',
          sku: 'SKU-001',
          rewinderNo: 'RW-01',
          rows: [
            { rollNo: 'R101', vendor: 'Vendor A', declaredNetWt: 50, vendorDeclaredLength: 1000, noOfPouchesVendorData: 5000, wtRecordedAtUnit: 50.2, rollDiameterAtUnit: 400, eyemarkCountedAtUnit: 4999, noOfUnprintedPouches: 5, operatorSignature: 'Operator 1', remarks: 'Good' },
            { rollNo: 'R102', vendor: 'Vendor B', declaredNetWt: 48, vendorDeclaredLength: 950, noOfPouchesVendorData: 4800, wtRecordedAtUnit: 48.1, rollDiameterAtUnit: 390, eyemarkCountedAtUnit: 4800, noOfUnprintedPouches: 0, operatorSignature: 'Operator 1', remarks: 'Check again' }
          ]
        }),
        logs: { create: { action: 'Created', userId: admin.id } }
      }
    });

    // 2. Create a Packing Shift Report
    await prisma.document.create({
      data: {
        type: 'Packing Shift Report',
        location: shed,
        itemName: 'Packing Report',
        status: 'Completed',
        createdById: admin.id,
        checkedById: admin.id,
        checkedAt: now,
        verifiedById: admin.id,
        verifiedAt: now,
        data: JSON.stringify({
          date: now.toISOString().split('T')[0],
          shift: 'B',
          shiftIncharge: 'Admin Incharge',
          varietySKU: 'Premium Product',
          selectedMachines: ['M1', 'M2'],
          entries: {
            'output_M1': '1000', 'output_M2': '1100',
            'wastage_M1': '5', 'wastage_M2': '6',
            'breakdown_M1': '10', 'breakdown_M2': '0'
          }
        }),
        logs: { 
          create: [
            { action: 'Created', userId: admin.id },
            { action: 'Checked', userId: admin.id },
            { action: 'Verified', userId: admin.id }
          ]
        }
      }
    });
  }

  console.log('--- Dummy Data Generation Completed ---');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
