import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { decryptTotp } from '../src/utils/crypto.util.js';

const BASE = process.env['NOVA_POST_BASE_URL']!;

async function main() {
  const adapter = new PrismaPg(process.env['DATABASE_URL']!);
  const db = new PrismaClient({ adapter } as any);
  await (db as any).$connect();

  // 1. Get any active Nova Post connection
  const conn = await (db as any).userPostalConnection.findFirst({
    where: { status: 'ACTIVE', postalService: { slug: 'nova-post' } },
    include: { postalService: { select: { slug: true } } },
    orderBy: { connectedAt: 'desc' },
  });
  if (!conn) { console.error('No active Nova Post connection found'); process.exit(1); }

  const apiKey = decryptTotp(conn.apiKey);

  // 2. Get Nova Post JWT
  const authRes = await fetch(`${BASE}/clients/authorization?apiKey=${encodeURIComponent(apiKey)}`);
  if (!authRes.ok) { console.error('Auth failed:', authRes.status, await authRes.text()); process.exit(1); }
  const { jwt } = await authRes.json() as { jwt: string };
  console.log('✓ Got Nova Post JWT');

  // 3. Get first UA division
  const divRes = await fetch(`${BASE}/divisions?countryCodes=UA&limit=1`, {
    headers: { Authorization: jwt },
  });
  if (!divRes.ok) { console.error('Divisions failed:', divRes.status, await divRes.text()); process.exit(1); }
  const divBody = await divRes.json() as { data: { number: string; address: string }[] };
  const division = divBody.data?.[0];
  if (!division) { console.error('No UA divisions returned'); process.exit(1); }
  console.log(`✓ Sender division: ${division.number} — ${division.address}`);

  // 4. Build payload
  const payload = {
    status: 'ReadyToShip',
    payerType: 'Sender',
    clientOrder: 'TEST-001',
    deliveryType: 'standard',
    sender: {
      name: 'Іван Петренко',
      phone: '380501234567',
      countryCode: 'UA',
      divisionNumber: division.number,
    },
    recipient: {
      name: 'Hans Müller',
      phone: '491234567890',
      countryCode: 'DE',
      addressParts: {
        city: 'Berlin',
        street: 'Unter den Linden',
        building: '10',
        flat: '2',
        postCode: '10117',
        region: 'Berlin',
      },
    },
    parcels: [{
      rowNumber: 1,
      cargoCategory: 'parcel',
      parcelDescription: 'Cotton clothing',
      insuranceCost: 100,
      insuranceCurrencyCode: 'EUR',
      length: 400,
      width: 300,
      height: 200,
      actualWeight: 1500,
    }],
    invoice: {
      customerNumber: 'INV-TEST-001',
      customerCreatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, '.000000Z'),
      type: 'Invoice',
      incoterm: 'DAP',
      exportReason: 'Selling',
      cost: 100,
      currency: 'EUR',
      payerFeesCustoms: 'Recipient',
      items: [{
        id: '1',
        hsCode: '61091000',
        name: 'Бавовняна футболка',
        nameEng: 'Cotton T-shirt',
        materialEng: '100% cotton',
        madeInCountryCode: 'UA',
        measurementCode: 'PCE',
        amount: 2,
        cost: 50,
        actualWeight: 750,
      }],
    },
  };

  console.log('\n=== Payload sent to Nova Post ===');
  console.log(JSON.stringify(payload, null, 2));

  // 5. Create shipment
  const shipRes = await fetch(`${BASE}/shipments`, {
    method: 'POST',
    headers: { Authorization: jwt, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await shipRes.json();
  console.log('\n=== Nova Post response ===');
  console.log(JSON.stringify(result, null, 2));

  if (!shipRes.ok) {
    console.error(`\n✗ Failed: HTTP ${shipRes.status}`);
  } else {
    console.log(`\n✓ Shipment created! TTN: ${(result as any).number}`);
  }

  await (db as any).$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
