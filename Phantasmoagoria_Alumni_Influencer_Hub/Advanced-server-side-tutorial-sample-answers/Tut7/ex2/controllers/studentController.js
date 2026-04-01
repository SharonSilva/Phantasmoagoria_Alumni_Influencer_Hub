const studentModel = require('../models/studentModel');

class StudentController {
  async getAllStudents(req, res) {
    const students = await studentModel.getAllStudents();
    res.json(students);
  }

  async getStudentById(req, res) {
    try {
      const student = await studentModel.getStudentById(req.params.id);
      res.json(student);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async createStudent(req, res) {
    try {
      const newStudent = await studentModel.createStudent(req.body);
      res.status(201).json(newStudent);

    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateStudent(req, res) {
    try {
      const updatedStudent = await studentModel.updateStudent(req.params.id, req.body);
      res.json(updatedStudent);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteStudent(req, res) {
    await studentModel.deleteStudent(req.params.id);
    res.status(204).send();
  }
}

module.exports = new StudentController();