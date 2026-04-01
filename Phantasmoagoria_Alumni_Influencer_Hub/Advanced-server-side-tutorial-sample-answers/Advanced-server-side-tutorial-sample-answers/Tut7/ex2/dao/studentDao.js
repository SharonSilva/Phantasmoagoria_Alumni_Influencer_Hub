const db = require('../config/db');

class StudentDao {
  async getAllStudents() {
    const [rows] = await db.query('SELECT * FROM students');
    return rows;
  }

  async getStudentById(id) {
    const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async createStudent(studentData) {
    const { first_name, last_name, email, age, course } = studentData;
    const [result] = await db.query('INSERT INTO students (first_name, last_name, email, age, course) VALUES (?, ?, ?, ?, ?)', [first_name, last_name, email, age, course]);
    return { id: result.insertId, ...studentData };
  }

  async updateStudent(id, studentData) {
    const fields = [];
    const values = [];

    // Build query dynamically
    if (studentData.first_name !== undefined) {
      fields.push("first_name = ?");
      values.push(studentData.first_name);
    }

    if (studentData.last_name !== undefined) {
      fields.push("last_name = ?");
      values.push(studentData.last_name);
    }

    if (studentData.email !== undefined) {
      fields.push("email = ?");
      values.push(studentData.email);
    }

    if (studentData.age !== undefined) {
      fields.push("age = ?");
      values.push(studentData.age);
    }

    if (studentData.course !== undefined) {
      fields.push("course = ?");
      values.push(studentData.course);
    }

    // If no fields provided
    if (fields.length === 0) {
      throw new Error("No data provided for update");
    }

    values.push(id);

    const query = `UPDATE students SET ${fields.join(", ")} WHERE id = ?`;

    await db.query(query, values);

    return { id, ...studentData };
  }

  async deleteStudent(id) {
    await db.query('DELETE FROM students WHERE id = ?', [id]);
  }

  async getStudentByEmail(email) {
    const [rows] = await db.query('SELECT * FROM students WHERE email = ?', [email]);
    return rows[0] || null;
  }
}

module.exports = new StudentDao();