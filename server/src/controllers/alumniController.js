/**
 * Alumni Controller
 * Handles alumni listing, filtering, and search
 */

const { db } = require('../db');
const User = require('../models/User');
const Profile = require('../models/Profile');

class AlumniController {
  /**
   * Get all alumni with filtering
   * GET /api/alumni?programme=CS&graduationYear=2018&industry=Tech&search=john&page=1&limit=20
   */
  static getAllAlumni(req, res) {
    try {
      const { 
        programme, 
        graduationYear, 
        industry, 
        search,
        page = 1,
        limit = 20
      } = req.query;

      let profiles = [...db.profiles];

      // Filter by programme
      if (programme) {
        profiles = profiles.filter(p => 
          p.programme?.toLowerCase() === programme.toLowerCase()
        );
      }

      // Filter by graduation year
      if (graduationYear) {
        profiles = profiles.filter(p => 
          p.graduationYear === parseInt(graduationYear)
        );
      }

      // Filter by industry
      if (industry) {
        profiles = profiles.filter(p => 
          p.industry?.toLowerCase() === industry.toLowerCase()
        );
      }

      // Search by name or bio
      if (search) {
        const searchLower = search.toLowerCase();
        profiles = profiles.filter(p => {
          const user = User.findById(p.userId);
          const name = user?.name?.toLowerCase() || '';
          const bio = p.bio?.toLowerCase() || '';
          return name.includes(searchLower) || bio.includes(searchLower);
        });
      }

      // Pagination
      const pageNum = parseInt(page);
      const pageSize = parseInt(limit);
      const startIndex = (pageNum - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const totalCount = profiles.length;
      const paginatedProfiles = profiles.slice(startIndex, endIndex);

      // Enrich with user data and certifications
      const enrichedProfiles = paginatedProfiles.map(profile => {
        const user = User.findById(profile.userId);
        const certs = db.certifications.filter(c => c.profileId === profile.id);
        const degrees = db.degrees.filter(d => d.profileId === profile.id);
        const sponsorships = db.sponsorships.filter(s => s.profileId === profile.id);

        return {
          id: profile.id,
          userId: profile.userId,
          name: user?.name || 'Unknown',
          email: user?.email,
          currentRole: profile.currentRole,
          currentEmployer: profile.currentEmployer,
          programme: profile.programme,
          graduationYear: profile.graduationYear,
          industry: profile.industry,
          bio: profile.bio,
          linkedInUrl: profile.linkedInUrl,
          photoUrl: profile.photoUrl,
          walletBalance: profile.walletBalance || 0,
          certifications: certs.map(c => ({
            id: c.id,
            name: c.name,
            issuer: c.issuer,
            completedDate: c.completedDate
          })),
          degrees: degrees.map(d => ({
            id: d.id,
            title: d.title,
            institution: d.institution,
            completedDate: d.completedDate
          })),
          sponsorships: sponsorships.map(s => ({
            id: s.id,
            sponsorName: db.sponsors.find(sp => sp.id === s.sponsorId)?.name,
            amount: s.offerAmount,
            status: s.status
          }))
        };
      });

      res.json({
        success: true,
        data: enrichedProfiles,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNextPage: endIndex < totalCount
        }
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching alumni',
        error: err.message 
      });
    }
  }

  /**
   * Get single alumni profile
   * GET /api/alumni/:id
   */
  static getAlumniById(req, res) {
    try {
      const { id } = req.params;
      const profile = db.profiles.find(p => p.id === id);

      if (!profile) {
        return res.status(404).json({ 
          success: false, 
          message: 'Alumni not found' 
        });
      }

      const user = User.findById(profile.userId);
      const certs = db.certifications.filter(c => c.profileId === profile.id);
      const degrees = db.degrees.filter(d => d.profileId === profile.id);
      const licences = db.licences.filter(l => l.profileId === profile.id);
      const courses = db.courses.filter(c => c.profileId === profile.id);
      const employment = db.employmentHistory.filter(e => e.profileId === profile.id);
      const sponsorships = db.sponsorships.filter(s => s.profileId === profile.id);

      res.json({
        success: true,
        data: {
          id: profile.id,
          userId: profile.userId,
          name: user?.name,
          email: user?.email,
          currentRole: profile.currentRole,
          currentEmployer: profile.currentEmployer,
          programme: profile.programme,
          graduationYear: profile.graduationYear,
          industry: profile.industry,
          bio: profile.bio,
          linkedInUrl: profile.linkedInUrl,
          photoUrl: profile.photoUrl,
          walletBalance: profile.walletBalance || 0,
          certifications: certs,
          degrees,
          licences,
          courses,
          employmentHistory: employment,
          sponsorships
        }
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }
  }

  /**
   * Get alumni by programme
   * GET /api/alumni/programme/:programme
   */
  static getByProgramme(req, res) {
    try {
      const { programme } = req.params;
      const profiles = db.profiles.filter(p => 
        p.programme?.toLowerCase() === programme.toLowerCase()
      );

      res.json({
        success: true,
        programme,
        count: profiles.length,
        data: profiles
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get alumni statistics
   * GET /api/alumni/stats
   */
  static getAlumniStats(req, res) {
    try {
      const stats = {
        total: db.profiles.length,
        byProgramme: {},
        byIndustry: {},
        byGraduationYear: {},
        withCertifications: new Set(db.certifications.map(c => c.profileId)).size,
        withSponsorships: new Set(db.sponsorships.map(s => s.profileId)).size,
        avgWalletBalance: (db.profiles.reduce((sum, p) => sum + (p.walletBalance || 0), 0) / db.profiles.length).toFixed(2)
      };

      db.profiles.forEach(p => {
        stats.byProgramme[p.programme] = (stats.byProgramme[p.programme] || 0) + 1;
        stats.byIndustry[p.industry] = (stats.byIndustry[p.industry] || 0) + 1;
        stats.byGraduationYear[p.graduationYear] = (stats.byGraduationYear[p.graduationYear] || 0) + 1;
      });

      res.json({ success: true, ...stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = AlumniController;