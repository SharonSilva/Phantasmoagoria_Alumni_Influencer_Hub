const db = require('../configs/db')

async function getAllCourses() {
  const [rows] = await db.execute('SELECT * FROM courses');
  return rows;
}

async function getCourseById(id) {
  const [rows] = await db.execute('SELECT * FROM courses WHERE course_id = ?', [id]);
  return rows[0] || null;
}

async function createCourse(data) {
  const {course_name,instructor_name,credit_value,department} = data;
  const [result] = await db.execute(
    'INSERT INTO courses (course_name, instructor_name, credit_value, department) VALUES (?, ?, ?, ?)',
    [course_name, instructor_name, credit_value, department]
  );
  return { id: result.insertId, ...data };
}

async function updateCourse(id, data) {
  const {course_name,instructor_name,credit_value,department} = data;
  await db.execute(
    'UPDATE courses SET course_name = ?, instructor_name = ?, credit_value = ?, department = ? WHERE course_id = ?',
    [course_name, instructor_name, credit_value, department, id]
  );
}

async function deleteCourse(id) {
  if (!await getCourseById(id)) {
    throw new Error('Course not found');
  }
  await db.execute('DELETE FROM courses WHERE course_id = ?', [id]);
}

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
};
