'use strict';
require('dotenv').config();
const studentRoutes = require('../src/interfaces/http/routes/studentRoutes');
const classRoutes = require('../src/interfaces/http/routes/classRoutes');
const enrollmentRoutes = require('../src/interfaces/http/routes/enrollmentRoutes');

const list = (r) => r.stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);

console.log('--- students ---');
console.log(list(studentRoutes).join('\n'));
console.log('\n--- classes ---');
console.log(list(classRoutes).join('\n'));
console.log('\n--- enrollments ---');
console.log(list(enrollmentRoutes).join('\n'));