const studentDao = require('../dao/studentDao');

class StudentModel {
    constructor() {
      this.studentDao = studentDao;
    }

  async getAllStudents() {
    const students = await this.studentDao.getAllStudents();
    return students;
  }

  async getStudentById(id) {
    const student = await this.studentDao.getStudentById(id);
    if (student) {
      return student;
    } else {
      throw new Error('Student not found');
    }
  }

async createStudent(data) {
  // Check existing student by email
  const existingStudent = await this.studentDao.getStudentByEmail(data.email);

  if (existingStudent) {
    throw new Error("Student with this email already exists");
  }

  const newStudent = await this.studentDao.createStudent(data);
  return newStudent;
}

  async updateStudent(id, data) {
    const updatedStudent = await this.studentDao.updateStudent(id, data);
    return updatedStudent;
  }

  async deleteStudent(id) {
    await this.studentDao.deleteStudent(id);
    return;
  }

  async getStudentByEmail(email) {
    const student = await this.studentDao.getStudentByEmail(email);
    return student;
  }

}

module.exports = new StudentModel();