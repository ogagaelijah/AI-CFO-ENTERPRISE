// scripts/test-fee-use-cases.js
require('dotenv').config();

const FeeRepository = require('../src/infrastructure/database/sqlite/repositories/FeeRepository');
const StudentRepository = require('../src/infrastructure/database/sqlite/repositories/StudentRepository');
const TermRepository = require('../src/infrastructure/database/sqlite/repositories/TermRepository');
const ClassRepository = require('../src/infrastructure/database/sqlite/repositories/ClassRepository');
const EnrollmentRepository = require('../src/infrastructure/database/sqlite/repositories/EnrollmentRepository');

const GenerateFeeUseCase = require('../src/application/useCases/fees/GenerateFeeUseCase');
const GenerateFeesForClassUseCase = require('../src/application/useCases/fees/GenerateFeesForClassUseCase');
const GetFeeUseCase = require('../src/application/useCases/fees/GetFeeUseCase');
const GetFeesUseCase = require('../src/application/useCases/fees/GetFeesUseCase');
const UpdateFeeUseCase = require('../src/application/useCases/fees/UpdateFeeUseCase');
const DeleteFeeUseCase = require('../src/application/useCases/fees/DeleteFeeUseCase');

const { closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const feeRepo = new FeeRepository();
    const studentRepo = new StudentRepository();
    const termRepo = new TermRepository();
    const classRepo = new ClassRepository();
    const enrollRepo = new EnrollmentRepository();

    const gen = new GenerateFeeUseCase({
        feeRepository: feeRepo,
        studentRepository: studentRepo,
        termRepository: termRepo,
        classRepository: classRepo,
    });
    const genBulk = new GenerateFeesForClassUseCase({
        feeRepository: feeRepo,
        studentRepository: studentRepo,
        termRepository: termRepo,
        classRepository: classRepo,
        enrollmentRepository: enrollRepo,
    });
    const getOne = new GetFeeUseCase({ feeRepository: feeRepo });
    const getMany = new GetFeesUseCase({ feeRepository: feeRepo });
    const upd = new UpdateFeeUseCase({ feeRepository: feeRepo });
    const del = new DeleteFeeUseCase({ feeRepository: feeRepo });

    // All these should throw clean "required" errors when args missing.
    // We're smoke-testing that the modules load and validate properly.

    const checkThrows = async (fn, label) => {
        try {
            await fn();
            console.error('❌', label, '- expected throw');
            process.exitCode = 1;
        } catch (e) {
            console.log('✅', label, '-', e.message);
        }
    };

    await checkThrows(() => gen.execute({}), 'generate: missing businessId');
    await checkThrows(() => getOne.execute({}), 'getOne: missing feeId');
    await checkThrows(() => getMany.execute({}), 'getMany: missing businessId');
    await checkThrows(() => upd.execute({}), 'update: missing feeId');
    await checkThrows(() => del.execute({}), 'delete: missing feeId');

    // Generate with nonsense student → should throw "Student not found"
    await checkThrows(
        () => gen.execute({ businessId: 10, studentId: 999999, termId: 999999 }),
        'generate: student not found'
    );

    console.log('\nAll use cases loaded and validated.');

    await closePool();
    process.exit(process.exitCode || 0);
})().catch(async (e) => {
    console.error('ERR:', e.message, e.stack);
    try { await closePool(); } catch {}
    process.exit(1);
});