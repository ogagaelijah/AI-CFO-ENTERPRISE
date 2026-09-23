// scripts/test-pledge-use-cases.js
require('dotenv').config();

const PledgeRepository = require('../src/infrastructure/database/sqlite/repositories/PledgeRepository');
const CustomerRepository = require('../src/infrastructure/database/sqlite/repositories/CustomerRepository');
const DonationRepository = require('../src/infrastructure/database/sqlite/repositories/DonationRepository');

const CreatePledgeUseCase = require('../src/application/useCases/pledges/CreatePledgeUseCase');
const GetPledgeUseCase = require('../src/application/useCases/pledges/GetPledgeUseCase');
const GetPledgesUseCase = require('../src/application/useCases/pledges/GetPledgesUseCase');
const UpdatePledgeUseCase = require('../src/application/useCases/pledges/UpdatePledgeUseCase');
const DeletePledgeUseCase = require('../src/application/useCases/pledges/DeletePledgeUseCase');

const { closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const pledgeRepo = new PledgeRepository();
    const customerRepo = new CustomerRepository();
    const donationRepo = new DonationRepository();

    const create = new CreatePledgeUseCase({
        pledgeRepository: pledgeRepo,
        customerRepository: customerRepo,
    });
    const getOne = new GetPledgeUseCase({ pledgeRepository: pledgeRepo });
    const getMany = new GetPledgesUseCase({ pledgeRepository: pledgeRepo });
    const update = new UpdatePledgeUseCase({
        pledgeRepository: pledgeRepo,
        customerRepository: customerRepo,
    });
    const del = new DeletePledgeUseCase({
        pledgeRepository: pledgeRepo,
        donationRepository: donationRepo,
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

    await checkThrows(() => create.execute({}), 'create: missing businessId');
    await checkThrows(() => create.execute({ businessId: 1 }), 'create: missing amount');
    await checkThrows(
        () => create.execute({ businessId: 1, amount: -100 }),
        'create: negative amount'
    );

    await checkThrows(() => getOne.execute({}), 'getOne: missing pledgeId');
    await checkThrows(() => getMany.execute({}), 'getMany: missing businessId');
    await checkThrows(() => update.execute({}), 'update: missing pledgeId');
    await checkThrows(() => del.execute({}), 'delete: missing pledgeId');

    // Real empty read — should not throw
    const list = await getMany.execute({ businessId: 17 });
    console.log('✅ getMany on empty business returned', list.pledges.length, 'pledges');
    console.log('   summary:', JSON.stringify(list.summary));

    console.log('\nAll pledge use cases loaded and validated.');
    await closePool();
    process.exit(process.exitCode || 0);
})().catch(async (e) => {
    console.error('ERR:', e.message, e.stack);
    try { await closePool(); } catch {}
    process.exit(1);
});