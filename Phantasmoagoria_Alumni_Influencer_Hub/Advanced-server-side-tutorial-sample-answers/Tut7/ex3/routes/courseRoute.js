const express = require('express');
const courseController = require('../controllers/courseController');

const router = express.Router();

router.get('/', courseController.getAllCourses);
router.get('/:course_id', courseController.getCourseById);
router.post('/', courseController.createCourse);
router.put('/:course_id', courseController.updateCourse);
router.delete('/:course_id', courseController.deleteCourse);

module.exports = router;