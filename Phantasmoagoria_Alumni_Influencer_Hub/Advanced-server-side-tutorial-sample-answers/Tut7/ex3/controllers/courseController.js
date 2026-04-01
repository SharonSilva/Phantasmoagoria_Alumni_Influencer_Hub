const courseModel = require('../models/courseModel');

async function getAllCourses(req, res, next) {
  try {
    const courses = await courseModel.getAllCourses();
    res.json({ courses });
  } catch (err) {
    next(err);
  }
}

async function getCourseById(req, res, next) {
  const id = req.params.course_id;
  try {
    const course = await courseModel.getCourseById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ course });
  } catch (err) {
    next(err);
  }
}

async function createCourse(req, res, next) {
  const data = req.body;
  try {
    const newCourse = await courseModel.createCourse(data);
    res.status(201).json({ course: newCourse });
  } catch (err) {
    next(err);
  }
}

async function updateCourse(req, res, next) {
  const id = req.params.course_id;
  const data = req.body;
  try {
    await courseModel.updateCourse(id, data);
    res.json({ message: 'Course updated successfully' });
  } catch (err) {
    if (err.message === 'Course not found') {
      return res.status(404).json({ message: 'Course not found' });
    }
    next(err);
  }
}

async function deleteCourse(req, res, next) {
  const id = req.params.course_id;
  try {
    await courseModel.deleteCourse(id);
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    if (err.message === 'Course not found') {
      return res.status(404).json({ message: 'Course not found' });
    }
    next(err);
  }
}

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
};