 'use strict';

 const db = require('../../db');

 function getStudentById(req, res) {
   const id = parseInt(req.params.id, 10);
   if (Number.isNaN(id) || !db.students[id]) {
     res.status(404).json({ error: 'Student not found' });
     return null;
   }
   return { id, student: db.students[id] };
 }

 // GET /students - view all students
 exports.list = (req, res) => {
   const studentsWithId = db.students.map((s, idx) => ({
     id: idx,
     name: s.name,
     grade: s.grade
   }));
   res.json({ students: studentsWithId });
 };

 // GET /students/:id - view one student
 exports.getOne = (req, res) => {
   const result = getStudentById(req, res);
   if (!result) return;

   res.json({
     student: {
       id: result.id,
       name: result.student.name,
       grade: result.student.grade
     }
   });
 };

 // POST /students - create new student
 exports.create = (req, res) => {
   const body = req.body || {};
   const name = body.name;
   const grade = body.grade;

   if (!name) {
     return res.status(400).json({ error: 'name is required' });
   }

   const numericGrade = typeof grade === 'undefined' ? null : Number(grade);

   const student = { name, grade: numericGrade };
   db.students.push(student);
   const id = db.students.length - 1;

   res.status(201).json({
     success: true,
     student: { id, name: student.name, grade: student.grade }
   });
 };

 // PUT /students/:id - full update
 exports.update = (req, res) => {
   const result = getStudentById(req, res);
   if (!result) return;

   const body = req.body || {};
   const name = body.name;
   const grade = body.grade;

   if (!name || typeof grade === 'undefined') {
     return res.status(400).json({ error: 'name and grade are required' });
   }

   result.student.name = name;
   result.student.grade = Number(grade);

   res.json({
     success: true,
     student: {
       id: result.id,
       name: result.student.name,
       grade: result.student.grade
     }
   });
 };

 // PATCH /students/:id - partial update
 exports.patch = (req, res) => {
   const result = getStudentById(req, res);
   if (!result) return;

   const body = req.body || {};

   if (typeof body.name !== 'undefined') {
     result.student.name = body.name;
   }
   if (typeof body.grade !== 'undefined') {
     result.student.grade = Number(body.grade);
   }

   res.json({
     success: true,
     student: {
       id: result.id,
       name: result.student.name,
       grade: result.student.grade
     }
   });
 };

 // DELETE /students/:id - delete student
 exports.destroy = (req, res) => {
   const result = getStudentById(req, res);
   if (!result) return;

   db.students.splice(result.id, 1);
   res.status(204).end();
 };
