process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed.js';
import { Product } from '../models/Product.js';
import { Seller } from '../models/Seller.js';
import { Order } from '../models/Order.js';
import { SellerOrder } from '../models/SellerOrder.js';
import { Invoice } from '../models/Invoice.js';
import { InvoiceCounter } from '../models/InvoiceCounter.js';
import {
  allocateInvoiceNumber,
  generateCustomerInvoice,
  cancelInvoiceAndIssueCreditNote,
  renderInvoiceHtml,
} from '../services/invoice.service.js';

async function runInvoiceTests() {
  console.log('🧪 Starting Milestone 5 Invoicing, Tax & Concurrency Test Suite...\n');

  await connectDB();
  await seedDatabase(false);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Helper: Obtain authentication cookies for all actors
    // -------------------------------------------------------------
    const { MockOtpProvider } = await import('../services/otp/MockOtpProvider.js');
    async function loginActor(email: string, password: string, role: 'customer' | 'seller' | 'admin') {
      if (role === 'admin') {
        const res = await request(app).post('/api/auth/admin/login').send({ email, password });
        return res.headers['set-cookie'];
      }
      const endpoint = role === 'seller' ? '/api/auth/seller/login' : '/api/auth/customer/login';
      const step1 = await request(app).post(endpoint).send({ email, password });
      if (step1.body?.data?.mfaRequired) {
        const otp = MockOtpProvider.getLastOtpFor(email);
        const step2 = await request(app).post('/api/auth/login/verify-otp').send({
          tempToken: step1.body.data.tempToken,
          channel: 'email',
          otp,
        });
        return step2.headers['set-cookie'];
      }
      return step1.headers['set-cookie'];
    }

    const customer1Cookies = await loginActor('ananya@example.com', 'Password@123', 'customer');
    const customer2Cookies = await loginActor('rahul@example.com', 'Password@123', 'customer');
    const seller1Cookies = await loginActor('debjani@mrittika.com', 'Password@123', 'seller');
    const seller2Cookies = await loginActor('biren@shantiniketanleather.com', 'Password@123', 'seller');
    const adminCookies = await loginActor('admin@kumorpara.com', 'Password@123', 'admin');

    // =============================================================
    // 1. 50 Parallel Number Allocation Concurrency Test
    // =============================================================
    console.log('--- Test 1: 50 Parallel Invoice Number Allocations Concurrency Test ---');
    const allocationPromises = Array.from({ length: 50 }).map(() =>
      allocateInvoiceNumber('2026-27', 'sale')
    );

    const allocations = await Promise.all(allocationPromises);
    const invoiceNumbers = allocations.map((a) => a.invoiceNumber);
    const sequences = allocations.map((a) => a.sequence);

    assert(allocations.length === 50, 'Exactly 50 allocations executed in parallel');

    const uniqueNumbers = new Set(invoiceNumbers);
    assert(
      uniqueNumbers.size === 50,
      `All 50 allocated invoice numbers are strictly unique with zero collisions (Unique count: ${uniqueNumbers.size})`
    );

    // Assert sequential continuity (1 to 50)
    sequences.sort((a, b) => a - b);
    const isSequential = sequences.every((seq, index) => seq === index + 1);
    assert(isSequential, 'Allocations are strictly sequential from 1 to 50 with no gaps');
    assert(
      invoiceNumbers[0].startsWith('KP/2026-27/'),
      'Invoice format conforms to KP/2026-27/000001 format'
    );

    // =============================================================
    // 2. Failure Handling Test (Simulate failed creation after allocation)
    // =============================================================
    console.log('\n--- Test 2: Documented Allocation Failure Handling ---');
    // Allocate sequence #51
    const { sequence: seqBefore } = await allocateInvoiceNumber('2026-27', 'sale');
    assert(seqBefore === 51, 'Sequence allocation increments monotonically to 51');

    // Simulate failed invoice save / DB abort
    try {
      await Invoice.create({
        invoiceNumber: 'INVALID_INVOICE',
        // Missing required fields intentionally to force validation error
      });
    } catch (e) {
      // Documented handling: Database abort does not corrupt the counter series
    }

    // Subsequent allocation safely takes sequence #52 without collision
    const { sequence: seqAfter, invoiceNumber: nextNum } = await allocateInvoiceNumber(
      '2026-27',
      'sale'
    );
    assert(
      seqAfter === 52,
      `Subsequent allocation safely acquires sequence 52 without collision (Actual: ${seqAfter})`
    );
    assert(
      nextNum === 'KP/2026-27/000052',
      'Invoice number format remains consistently padded and unique'
    );

    // =============================================================
    // 3. GST Tax Invoice Test (Intra-State: WB to WB)
    // =============================================================
    console.log('\n--- Test 3: GST Tax Invoice Generation (Intra-State: WB to WB) ---');
    const kulharProduct = await Product.findOne({ slug: 'terracotta-matte-chai-kulhar-set-6' });

    // Place Order for Customer 1 (Kolkata, WB:19) with Mrittika Studio (GSTIN, WB:19)
    const intraOrderRes = await request(app)
      .post('/api/orders/checkout')
      .set('Cookie', customer1Cookies)
      .send({
        shippingAddress: {
          name: 'Ananya Sen',
          phone: '+919831122334',
          street: 'Flat 4B, Greenfield Heights, New Town',
          city: 'Kolkata',
          state: 'West Bengal',
          stateCode: '19',
          pincode: '700156',
        },
        items: [{ productId: kulharProduct!._id.toString(), qty: 1 }],
      });

    const intraSellerOrderId = intraOrderRes.body.data.sellerOrders[0]._id;

    // Generate Customer Invoice
    const intraInvoice = await generateCustomerInvoice(intraSellerOrderId);

    assert(!!intraInvoice.invoiceNumber, 'Generates customer invoice with sequential number');
    assert(intraInvoice.type === 'sale', 'Invoice type is "sale"');
    assert(intraInvoice.placeOfSupplyStateCode === '19', 'Place of supply is West Bengal (19)');
    assert(
      intraInvoice.supplierSnapshot.gstin === '19ABCDE1234F1Z5',
      'Supplier snapshot contains seller GSTIN'
    );

    // Intra-state tax split (CGST + SGST)
    const lineItem = intraInvoice.lineItems[0];
    assert(lineItem.gstRate === 12, 'Line item GST rate is 12%');
    assert(lineItem.cgst > 0 && lineItem.sgst > 0, 'Intra-state splits tax into CGST and SGST');
    assert(lineItem.cgst === lineItem.sgst, 'CGST and SGST amounts are equal half-splits');
    assert(lineItem.igst === 0, 'Intra-state IGST is exactly 0');
    assert(
      lineItem.taxableValue + lineItem.cgst + lineItem.sgst === lineItem.lineTotal,
      'Taxable value + CGST + SGST equals line total in integer paise'
    );

    // Render HTML
    const intraHtml = await renderInvoiceHtml(intraInvoice);
    assert(intraHtml.includes('TAX INVOICE'), 'Renders "TAX INVOICE" header for GST seller');
    assert(intraHtml.includes('CGST'), 'Renders CGST column for intra-state tax invoice');
    assert(intraHtml.includes('SGST'), 'Renders SGST column for intra-state tax invoice');
    assert(
      intraHtml.includes('This invoice is issued by Kumor Para on behalf of the supplier'),
      'Includes statutory Kumor Para intermediary agency footer'
    );

    // =============================================================
    // 4. GST Tax Invoice Test (Inter-State: WB to MH)
    // =============================================================
    console.log('\n--- Test 4: GST Tax Invoice Generation (Inter-State: WB to MH) ---');
    // Place Order for Customer 2 (Mumbai, MH:27) with Mrittika Studio (GSTIN, WB:19)
    const interOrderRes = await request(app)
      .post('/api/orders/checkout')
      .set('Cookie', customer2Cookies)
      .send({
        shippingAddress: {
          name: 'Rahul Sharma',
          phone: '+919820033445',
          street: '1202 Sea Breeze Apartments, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          stateCode: '27',
          pincode: '400050',
        },
        items: [{ productId: kulharProduct!._id.toString(), qty: 1 }],
      });

    const interSellerOrderId = interOrderRes.body.data.sellerOrders[0]._id;
    const interInvoice = await generateCustomerInvoice(interSellerOrderId);

    assert(interInvoice.placeOfSupplyStateCode === '27', 'Place of supply is Maharashtra (27)');
    const interLineItem = interInvoice.lineItems[0];
    assert(interLineItem.cgst === 0, 'Inter-state CGST is exactly 0');
    assert(interLineItem.sgst === 0, 'Inter-state SGST is exactly 0');
    assert(interLineItem.igst > 0, 'Inter-state charges 100% tax under IGST');
    assert(
      interLineItem.taxableValue + interLineItem.igst === interLineItem.lineTotal,
      'Taxable value + IGST equals line total in integer paise'
    );

    const interHtml = await renderInvoiceHtml(interInvoice);
    assert(interHtml.includes('IGST'), 'Renders IGST column for inter-state tax invoice');

    // =============================================================
    // 5. Non-GST Bill of Supply Test (Seller without GSTIN)
    // =============================================================
    console.log('\n--- Test 5: Non-GST Bill of Supply Generation ---');
    const walletProduct = await Product.findOne({
      slug: 'hand-stitched-leather-bifold-wallet-floral-batik',
    });

    const nonGstOrderRes = await request(app)
      .post('/api/orders/checkout')
      .set('Cookie', customer1Cookies)
      .send({
        shippingAddress: {
          name: 'Ananya Sen',
          phone: '+919831122334',
          street: 'Flat 4B, Greenfield Heights, New Town',
          city: 'Kolkata',
          state: 'West Bengal',
          stateCode: '19',
          pincode: '700156',
        },
        items: [{ productId: walletProduct!._id.toString(), qty: 1 }],
      });

    const nonGstSellerOrderId = nonGstOrderRes.body.data.sellerOrders[0]._id;
    const nonGstInvoice = await generateCustomerInvoice(nonGstSellerOrderId);

    assert(!nonGstInvoice.supplierSnapshot.gstin, 'Supplier has no GSTIN on record');
    assert(nonGstInvoice.taxTotal === 0, 'Non-GST Bill of Supply tax total is 0');
    assert(
      nonGstInvoice.taxableTotal === nonGstInvoice.grandTotal,
      'Taxable total equals grand total without tax breakdown'
    );

    const nonGstHtml = await renderInvoiceHtml(nonGstInvoice);
    assert(nonGstHtml.includes('BILL OF SUPPLY'), 'Renders "BILL OF SUPPLY" heading for non-GST seller');
    assert(
      !nonGstHtml.includes('<th>CGST</th>') && !nonGstHtml.includes('<th>IGST</th>'),
      'Does not render GST tax breakdown columns in Bill of Supply'
    );

    // =============================================================
    // 6. Immutability Enforcement Test
    // =============================================================
    console.log('\n--- Test 6: Invoice Immutability Enforcement ---');
    let immutabilityFailed = false;
    try {
      // Direct attempt to modify financial totals or seller snapshot on issued invoice
      intraInvoice.grandTotal = 999999;
      intraInvoice.taxableTotal = 888888;
      await intraInvoice.save();
    } catch (err: any) {
      immutabilityFailed = true;
      assert(
        err.message.includes('Immutability Violation'),
        'Mongoose pre-save hook strictly blocks modifying issued invoice content'
      );
    }
    assert(immutabilityFailed, 'Modifying issued invoice threw immutability violation error');

    // =============================================================
    // 7. Credit Note on Cancellation Test
    // =============================================================
    console.log('\n--- Test 7: Credit Note on Invoice Cancellation ---');
    const { originalInvoice: cancelledInv, creditNote } = await cancelInvoiceAndIssueCreditNote(
      intraInvoice._id.toString(),
      'Customer requested cancellation'
    );

    assert(cancelledInv.isCancelled === true, 'Original invoice is marked isCancelled: true');
    assert(!!cancelledInv.creditNoteId, 'Original invoice links to creditNoteId');
    assert(creditNote.type === 'credit_note', 'Credit note has type "credit_note"');
    assert(
      creditNote.creditNoteId!.toString() === cancelledInv._id.toString(),
      'Credit note references original invoice ID'
    );

    const creditNoteHtml = await renderInvoiceHtml(creditNote);
    assert(creditNoteHtml.includes('CREDIT NOTE'), 'Renders CREDIT NOTE document heading');

    // =============================================================
    // 8. Access-Controlled Document Streaming & CSV Export
    // =============================================================
    console.log('\n--- Test 8: Access Control & Streaming Endpoints ---');

    // Customer 2 tries to download Customer 1's invoice -> 403 Forbidden
    const unauthDownload = await request(app)
      .get(`/api/invoices/${intraInvoice._id}/download`)
      .set('Cookie', customer2Cookies);
    assert(unauthDownload.status === 403, 'Customer cannot download another customer invoice (403)');

    // Customer 1 downloads own invoice -> 200 OK
    const authDownload = await request(app)
      .get(`/api/invoices/${intraInvoice._id}/download`)
      .set('Cookie', customer1Cookies);
    assert(authDownload.status === 200, 'Customer successfully streams own invoice (200)');
    assert(
      authDownload.headers['content-type'].includes('text/html'),
      'Streams printable document format'
    );

    // Seller 1 (Mrittika Studio) downloads own sales invoice -> 200 OK
    const seller1Download = await request(app)
      .get(`/api/invoices/${intraInvoice._id}/download`)
      .set('Cookie', seller1Cookies);
    assert(seller1Download.status === 200, 'Seller 1 successfully streams own invoice via /download (200)');

    const seller1Pdf = await request(app)
      .get(`/api/invoices/${intraInvoice._id}/pdf`)
      .set('Cookie', seller1Cookies);
    assert(seller1Pdf.status === 200, 'Seller 1 successfully streams own invoice via /pdf (200)');
    assert(seller1Pdf.text.includes('TAX INVOICE'), 'Seller printable invoice contains TAX INVOICE heading');

    // Seller 2 (Shantiniketan Leather) tries to download Seller 1 (Mrittika Studio) invoice -> 403 Forbidden
    const crossSellerInvDownload = await request(app)
      .get(`/api/invoices/${intraInvoice._id}/download`)
      .set('Cookie', seller2Cookies);
    assert(crossSellerInvDownload.status === 403, 'Seller cannot access another seller invoice (403)');

    const crossSellerPdf = await request(app)
      .get(`/api/invoices/${intraInvoice._id}/pdf`)
      .set('Cookie', seller2Cookies);
    assert(crossSellerPdf.status === 403, 'Seller cannot access another seller invoice via /pdf (403)');

    // Admin downloads any invoice -> 200 OK
    const adminDownload = await request(app)
      .get(`/api/invoices/${intraInvoice._id}/download`)
      .set('Cookie', adminCookies);
    assert(adminDownload.status === 200, 'Admin can download any invoice (200)');

    // Admin CSV Export
    const csvRes = await request(app)
      .get('/api/invoices/admin/export-csv')
      .set('Cookie', adminCookies);
    assert(csvRes.status === 200, 'Admin exports invoice register as CSV (200)');
    assert(csvRes.headers['content-type'].includes('text/csv'), 'Returns text/csv content-type');
    assert(csvRes.text.includes('Invoice Number,Type'), 'CSV content contains standard register header');

  } catch (err: any) {
    console.error('Unexpected invoice test error:', err);
    failed++;
  } finally {
    console.log('\n======================================================');
    console.log(`📊 Invoice Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');
    await disconnectDB();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

if (process.argv[1]?.includes('invoice.test.ts') || process.argv[1]?.includes('invoice.test.js')) {
  runInvoiceTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
