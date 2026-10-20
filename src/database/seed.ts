
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';

async function seedDatabase(): Promise<void> {
    await dataSource.initialize();

    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // 1. Seed admin account
        const passwordHash = await bcrypt.hash('Admin@12345', 12);

        await queryRunner.query(
            `
      INSERT INTO admins
        (id, name, email, password_hash, "isActive", role, "createdAt", "updatedAt")
      VALUES
        ($1, $2, $3, $4, true, 'super_admin', NOW(), NOW())
      ON CONFLICT DO NOTHING
      `,
            [
                'a0000000-0000-4000-8000-000000000001',
                'MilesAssist Admin',
                'admin@milesassist.com',
                passwordHash,
            ],
        );

        // 2. Seed users
        const users = [
            ['b0000000-0000-4000-8000-000000000001', 'Aarav Sharma', 'aarav@example.com', 'active'],
            ['b0000000-0000-4000-8000-000000000002', 'Priya Patel', 'priya@example.com', 'active'],
            ['b0000000-0000-4000-8000-000000000003', 'Rohan Mehta', 'rohan@example.com', 'inactive'],
            ['b0000000-0000-4000-8000-000000000004', 'Ananya Singh', 'ananya@example.com', 'active'],
            ['b0000000-0000-4000-8000-000000000005', 'Vikram Shah', 'vikram@example.com', 'suspended'],
            ['b0000000-0000-4000-8000-000000000006', 'Neha Verma', 'neha@example.com', 'active'],
            ['b0000000-0000-4000-8000-000000000007', 'Kabir Joshi', 'kabir@example.com', 'active'],
            ['b0000000-0000-4000-8000-000000000008', 'Isha Gupta', 'isha@example.com', 'inactive'],
            ['b0000000-0000-4000-8000-000000000009', 'Arjun Rao', 'arjun@example.com', 'active'],
            ['b0000000-0000-4000-8000-000000000010', 'Meera Nair', 'meera@example.com', 'active'],
        ];

        for (const [id, name, email, status] of users) {
            await queryRunner.query(
                `
        INSERT INTO users
          (id, name, email, role, status, "lastActiveAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'viewer', $4, NOW(), NOW(), NOW())
        ON CONFLICT DO NOTHING
        `,
                [id, name, email, status],
            );
        }

        // 3. Seed bookings
        const bookings = [
            ['c0000000-0000-4000-8000-000000000001', 'BK-DEMO-001', users[0][0], 'Travel Consultation', 'virtual', 'confirmed', 120.00, 2],
            ['c0000000-0000-4000-8000-000000000002', 'BK-DEMO-002', users[1][0], 'Flight Booking Assistance', 'in_person', 'pending', 85.50, 5],
            ['c0000000-0000-4000-8000-000000000003', 'BK-DEMO-003', users[2][0], 'Hotel Reservation', 'virtual', 'completed', 200.00, 10],
            ['c0000000-0000-4000-8000-000000000004', 'BK-DEMO-004', users[3][0], 'Travel Consultation', 'virtual', 'cancelled', 75.00, -2],
            ['c0000000-0000-4000-8000-000000000005', 'BK-DEMO-005', users[4][0], 'Holiday Planning', 'in_person', 'confirmed', 350.00, 8],
            ['c0000000-0000-4000-8000-000000000006', 'BK-DEMO-006', users[5][0], 'Flight Booking Assistance', 'virtual', 'pending', 150.00, 15],
            ['c0000000-0000-4000-8000-000000000007', 'BK-DEMO-007', users[6][0], 'Hotel Reservation', 'virtual', 'completed', 95.00, -7],
            ['c0000000-0000-4000-8000-000000000008', 'BK-DEMO-008', users[7][0], 'Holiday Planning', 'in_person', 'confirmed', 500.00, 20],
        ];

        for (const [id, reference, userId, service, meetingType, status, amount, days] of bookings) {
            await queryRunner.query(
                `
        INSERT INTO bookings (
          id, "bookingReference", "userId", "serviceName", "meetingType",
          "scheduledAt", "durationMinutes", "meetingLocation", "meetingUrl",
          "specialNotes", status, amount, currency, "confirmedAt",
          "completedAt", "cancelledAt", "cancellationReason", "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5,
          NOW() + ($6 * INTERVAL '1 day'), 60, NULL, NULL,
          'Seeded demonstration booking', $7, $8, 'INR',
          CASE WHEN $7 IN ('confirmed', 'completed') THEN NOW() ELSE NULL END,
          CASE WHEN $7 = 'completed' THEN NOW() ELSE NULL END,
          CASE WHEN $7 = 'cancelled' THEN NOW() ELSE NULL END,
          CASE WHEN $7 = 'cancelled' THEN 'Schedule changed' ELSE NULL END,
          NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
        `,
                [id, reference, userId, service, meetingType, days, status, amount],
            );
        }

        // 4. Seed transactions
        const transactions = [
            ['d0000000-0000-4000-8000-000000000001', 'TX-DEMO-001', users[0][0], 'payment', 120.00, 'success', 'upi', bookings[0][0]],
            ['d0000000-0000-4000-8000-000000000002', 'TX-DEMO-002', users[1][0], 'payment', 85.50, 'pending', 'credit_card', bookings[1][0]],
            ['d0000000-0000-4000-8000-000000000003', 'TX-DEMO-003', users[2][0], 'payment', 200.00, 'success', 'debit_card', bookings[2][0]],
            ['d0000000-0000-4000-8000-000000000004', 'TX-DEMO-004', users[3][0], 'payment', 75.00, 'failed', 'net_banking', bookings[3][0]],
            ['d0000000-0000-4000-8000-000000000005', 'TX-DEMO-005', users[4][0], 'payment', 350.00, 'success', 'upi', bookings[4][0]],
            ['d0000000-0000-4000-8000-000000000006', 'TX-DEMO-006', users[5][0], 'payment', 150.00, 'pending', 'wallet', bookings[5][0]],
            ['d0000000-0000-4000-8000-000000000007', 'TX-DEMO-007', users[6][0], 'payment', 95.00, 'success', 'credit_card', bookings[6][0]],
            ['d0000000-0000-4000-8000-000000000008', 'TX-DEMO-008', users[7][0], 'payment', 500.00, 'success', 'upi', bookings[7][0]],
        ];

        for (const [id, reference, userId, type, amount, status, method, bookingId] of transactions) {
            await queryRunner.query(
                `
        INSERT INTO transactions (
          id, "transactionReference", "userId", type, amount, currency,
          status, "initiatedAt", "paidAt", "failureReason", "gatewayName",
          "gatewayTransactionId", "gatewayReference", "paymentMethod",
          "paymentDetails", "settlementStatus", "settledAt", "settlementUtr",
          "settledAmount", notes, "originalTransactionId", "bookingId",
          "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, 'INR',
          $6, NOW(), CASE WHEN $6 = 'success' THEN NOW() ELSE NULL END,
          CASE WHEN $6 = 'failed' THEN 'Payment declined (demo)' ELSE NULL END,
          'DemoGateway', $2, $2, $7, '{}'::jsonb,
          CASE WHEN $6 = 'success' THEN 'settled' ELSE 'pending' END,
          CASE WHEN $6 = 'success' THEN NOW() ELSE NULL END,
          CASE WHEN $6 = 'success' THEN 'UTR-' || $2 ELSE NULL END,
          CASE WHEN $6 = 'success' THEN $5 ELSE NULL END,
          'Seeded demonstration transaction', NULL, $8, NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
        `,
                [id, reference, userId, type, amount, status, method, bookingId],
            );
        }

        // 5. Seed transaction events
        for (const [index, transaction] of transactions.entries()) {
            await queryRunner.query(
                `
        INSERT INTO transaction_events
          (id, "transactionId", "eventType", description, reference, metadata, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
        ON CONFLICT DO NOTHING
        `,
                [
                    `e0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
                    transaction[0],
                    transaction[5] === 'success' ? 'payment_success' : 'payment_update',
                    `Demo transaction status: ${transaction[5]}`,
                    transaction[1],
                    JSON.stringify({ seeded: true, status: transaction[5] }),
                ],
            );
        }

        // 6. Seed refunds linked to successful transactions
        const refunds = [
            ['f0000000-0000-4000-8000-000000000001', transactions[2][0], 'RF-DEMO-001', 50.00, 'success'],
            ['f0000000-0000-4000-8000-000000000002', transactions[4][0], 'RF-DEMO-002', 100.00, 'pending'],
        ];

        for (const [id, transactionId, reference, amount, status] of refunds) {
            await queryRunner.query(
                `
        INSERT INTO refunds (
          id, "transactionId", "refundReference", "gatewayRefundId", arn,
          amount, currency, status, "initiatedAt", "processedAt",
          "failureReason", notes, "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, $3, NULL, NULL, $4, 'INR', $5, NOW(),
          CASE WHEN $5 = 'success' THEN NOW() ELSE NULL END,
          NULL, 'Seeded demonstration refund', NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
        `,
                [id, transactionId, reference, amount, status],
            );
        }

        // 7. Seed dashboard alerts
        const alerts = [
            ['10000000-0000-4000-8000-000000000001', 'Pending payments require attention', 'Some demo transactions are awaiting payment confirmation.', 'warning', 'open'],
            ['10000000-0000-4000-8000-000000000002', 'Payment failure detected', 'A demo payment transaction failed.', 'critical', 'open'],
            ['10000000-0000-4000-8000-000000000003', 'Seed data loaded', 'Demonstration records are available for dashboard testing.', 'info', 'acknowledged'],
        ];

        for (const [id, title, description, severity, status] of alerts) {
            await queryRunner.query(
                `
        INSERT INTO system_alerts
          (id, title, description, severity, status, "resolvedAt", "createdAt", "updatedAt")
        VALUES (
          $1, $2, $3, $4, $5,
          CASE WHEN $5 = 'resolved' THEN NOW() ELSE NULL END,
          NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
        `,
                [id, title, description, severity, status],
            );
        }

        await queryRunner.commitTransaction();

        console.log('Database seeded successfully.');
        console.log('Admin email: admin@milesassist.com');
        console.log('Admin password: Admin@12345');
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Database seeding failed:', error);
        process.exitCode = 1;
    } finally {
        await queryRunner.release();
        await dataSource.destroy();
    }
}

seedDatabase().catch((error) => {
    console.error('Seeder startup failed:', error);
    process.exitCode = 1;
});
