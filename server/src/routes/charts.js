const express = require('express');
const router = express.Router();
const ChartsController = require('../controllers/chartsController');
const { authenticateKey } = require('../middleware/Auth');
const { asyncHandler } = require('../middleware/errorHandler');

const chartAuth = authenticateKey(['read:analytics']);

router.get('/skills-gap', chartAuth, asyncHandler(ChartsController.getSkillsGap));
router.get('/career-trends', chartAuth, asyncHandler(ChartsController.getCareerTrends));
router.get('/industry-distribution', chartAuth, asyncHandler(ChartsController.getIndustryDistribution));
router.get('/certifications', chartAuth, asyncHandler(ChartsController.getCertifications));
router.get('/programme-distribution', chartAuth, asyncHandler(ChartsController.getProgrammeDistribution));
router.get('/graduation-years', chartAuth, asyncHandler(ChartsController.getGraduationYears));
router.get('/bidding-trends', chartAuth, asyncHandler(ChartsController.getBiddingTrends));
router.get('/sponsorships', chartAuth, asyncHandler(ChartsController.getSponsorships));

module.exports = router;