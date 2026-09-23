// scripts/test-donation-use-cases.js
require('dotenv').config();

const DonationRepository = require('../src/infrastructure/database/sqlite/repositories/DonationRepository');
const PledgeRepository = require('../src/infrastructure/database/sqlite/repositories/PledgeRepository');
const CustomerRepository = require('../src/infrastructure/database/sqlite/repositories/CustomerRepository');
const IncomeRepository = require('../src/infrastructure/database/sqlite/repositories/IncomeRepository');
const PaymentRepository = require('../src/infrastructure/database/sqlite/repositories/PaymentRepository');

const RecordDonationUseCase = require('../src/application/useCases/donations/RecordDonationUseCase');
const GetDonationUseCase = require('../src/application/useCases/donations/GetDonationUseCase');
const GetDonationsUseCase = require('../src/application/useCases/donations/GetDonationsUseCase');
const UpdateDonationUseCase = require('../src/application/useCases/donations/UpdateDonationUseCase');
const DeleteDonationUseCase = require('../src/application/useCases/donations/DeleteDonationUseCase');

const { closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const donationRepo = new DonationRepository();
    const pledgeRepo = new PledgeRepository();
    const customerRepo = new CustomerRepository();
    const incomeRepo = new IncomeRepository();
    const paymentRepo = new PaymentRepository();

    const record = new RecordDonationUseCase({
        donationRepository: donationRepo,
        pledgeRepository: pledgeRepo,
        customerRepository: customerRepo,
        incomeRepository: incomeRepo,
        paymentRepository: paymentRepo,
    });
    const getOne = new GetDonationUseCase({ donationRepository: donationRepo });
    const getMany = new GetDonationsUseCase({ donationRepository: donationRepo });
    const update = new UpdateDonationUseCase({
        donationRepository: donationRepo,
        customerRepository: customerRepo,
    });
    const del = new DeleteDonationUseCase({
        donationRepository: donationRepo,
        pledgeRepository: pledgeRepo,
        incomeRepository: incomeRepo,
        paymentRepository: paymentRepo,
    });

    const checkThrows = async (fn, label) => {
        try {
            await fn();
            console.error('❌', label, '- expected throw');
            process.exitCode = 1;
        } catch (e) {
            console.log('✅', label, '-', e.message);
        }
    };

    await checkThrows(() => record.execute({}), 'record: missing businessId');
    await checkThrows(() => record.execute({ businessId: 1 }), 'record: missing amount');
    await checkThrows(
        () => record.execute({ businessId: 1, amount: -100 }),
        'record: negative amount'
    );

    await checkThrows(() => getOne.execute({}), 'getOne: missing donationId');
    await checkThrows(() => getMany.execute({}), 'getMany: missing businessId');
    await checkThrows(() => update.execute({}), 'update: missing donationId');
    await checkThrows(() => del.execute({}), 'delete: missing donationId');

    // Real empty read
    const list = await getMany.execute({ businessId: 17 });
    console.log('✅ getMany on empty business returned', list.donations.length, 'donations');
    console.log('   summary:', JSON.stringify(list.summary));

    console.log('\nAll donation use cases loaded and validated.');
    await closePool();
    process.exit(process.exitCode || 0);
})().catch(async (e) => {
    console.error('ERR:', e.message, e.stack);
    try { await closePool(); } catch {}
    process.exit(1);
});