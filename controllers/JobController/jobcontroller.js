const JobPost = require("../../models/job/jobschema");
const CompanyProfile = require("../../models/job/CompanyProfileSchema");
const CompanyLogin = require("../../models/job/CompanyLoginSchema");
const CompanyProfileVisibility = require("../../models/job/CompanyProfileVisibilitySchema");

const mapCompany = (job, companyMap, companyLoginMap = new Map()) => {
    // 🔥 Company Profile (existing logic)
    const company = companyMap.get(String(job.companyId)) || {};

    // 🔥 Company Login (NEW – hiring info)
    const companyLogin = companyLoginMap.get(String(job.companyId)) || null;

    console.log("company profile:", company);
    console.log("company login:", companyLogin);

    return {
        ...job,

        /* ---------------------------------------------------
         * 🔥 COMPANY DATA (FROM CompanyProfile)
         * --------------------------------------------------- */
        companyName: company.companyName || job.companyName,
        companyLogo: company.logo || null,

        country: company.country || job.country,
        state: company.state || job.state,
        city: company.city || job.city,
        area: company.address || job.area,
        pincode: company.pincode || job.pincode,

        latitude: company.googleLocation?.coordinates?.[1] || null,
        longitude: company.googleLocation?.coordinates?.[0] || null,
        googleLocation: company.googleLocation || null,

        companyId: job.companyId,

        /* ---------------------------------------------------
         * ✅ HIRING INFO (FROM CompanyLogin)
         * --------------------------------------------------- */
        hiringInfo: companyLogin
            ? {
                name: companyLogin.name,
                position: companyLogin.position,
                email: companyLogin.email,
                phone: companyLogin.phone,
                whatsAppNumber: companyLogin.whatsAppNumber,
                accountType: companyLogin.accountType,
                companyName: companyLogin.companyName
            }
            : null
    };
};






const applyCompanyVisibility = (job, visibility) => {
    console.log(visibility)
    if (!visibility) return job;

    const filteredJob = { ...job };

    /* ---------------- COMPANY CONTACT ---------------- */
    if (visibility.companyPhone === "private") {
        delete filteredJob.companyPhone;
    }

    if (visibility.companyWhatsAppNumber === "private") {
        delete filteredJob.companyWhatsAppNumber;
    }

    if (visibility.companyEmail === "private") {
        delete filteredJob.companyEmail;
    }

    /* ---------------- LOCATION ---------------- */
    if (visibility.address === "private") {
        delete filteredJob.area;
        delete filteredJob.pincode;
    }

    if (visibility.googleLocation === "private") {
        delete filteredJob.latitude;
        delete filteredJob.longitude;
        delete filteredJob.googleLocation;
    }

    /* ---------------- HIRING INFO ---------------- */
    if (filteredJob.hiringInfo) {
        if (visibility.hiringEmail === "private") {
            delete filteredJob.hiringInfo.email;
        }

        if (visibility.hrPhone === "private") {
            delete filteredJob.hiringInfo.phone;
            delete filteredJob.hiringInfo.whatsAppNumber;
        }

        if (visibility.hrName === "private") {
            delete filteredJob.hiringInfo.name;
        }
    }

    return filteredJob;
};




exports.getAllJobsforMobile = async (req, res) => {
    try {
        console.log("🔍 Incoming Query Params:", req.query);
console.log("work");
        const {
            jobId,
            keyword,
            search,
            employmentType,
            workMode,
            jobIndustry,
            jobRole,
            requiredSkills,
            experience,
            salaryRange,
            minExp,
            maxExp,
            minSalary,
            maxSalary,
            companyId,
            lat,
            lng,
            radius,
            city,
            state,
        } = req.query;

        const q = keyword || search;
        const geoEnabled =
            lat &&
            lng &&
            radius &&
            !isNaN(lat) &&
            !isNaN(lng) &&
            Number(lat) !== 0 &&
            Number(lng) !== 0;

        /* ---------------------------------------------------
         * 1️⃣ SINGLE JOB FETCH (UNCHANGED)
         * --------------------------------------------------- */
        if (jobId) {
            console.log("🧩 Single job fetch:", jobId);

            const job = await JobPost.findOne({
                _id: jobId,
                status: "active",
                $or: [{ isApproved: true }, { isApproved: { $exists: false } }],
            }).lean();
            console.log("sjflskjdf", job)

            if (!job) {
                return res.json({ success: true, total: 0, jobs: [] });
            }

            const companyProfile = await CompanyProfile.findOne({
                companyId: job.companyId,
            }).lean();

            const companyLogin = await CompanyLogin.findById(job.companyId)
                .select("name position email phone whatsAppNumber accountType companyName")
                .lean();

            const visibility = await CompanyProfileVisibility.findOne({
                companyId: job.companyId,
            }).lean();

            const mappedJob = mapCompany(
                job,
                new Map([[String(job.companyId), companyProfile]]),
                new Map([[String(job.companyId), companyLogin]])
            );

            return res.json({
                success: true,
                total: 1,
                jobs: [applyCompanyVisibility(mappedJob, visibility)],
            });
        }

        /* ---------------------------------------------------
         * 2️⃣ BASE FILTER (UNCHANGED)
         * --------------------------------------------------- */
        const baseFilter = {
            status: "active",
            $or: [{ isApproved: true }, { isApproved: { $exists: false } }],
        };

        if (companyId) baseFilter.companyId = companyId;
        if (employmentType) baseFilter.employmentType = employmentType;
        if (workMode) baseFilter.workMode = workMode;
        if (jobIndustry) baseFilter.jobIndustry = new RegExp(jobIndustry, "i");
        if (jobRole) baseFilter.jobRole = { $in: jobRole.split(",") };
        if (requiredSkills)
            baseFilter.requiredSkills = { $in: requiredSkills.split(",") };

        if (experience) {
            const [minE, maxE] = experience.split("-").map(Number);
            baseFilter.$and = [
                { minimumExperience: { $lte: maxE } },
                { maximumExperience: { $gte: minE } },
            ];
        }

        if (minExp) baseFilter.minimumExperience = { $gte: Number(minExp) };
        if (maxExp) baseFilter.maximumExperience = { $lte: Number(maxExp) };

        if (salaryRange) {
            const [minS, maxS] = salaryRange.split("-").map(Number);
            baseFilter.$and = [
                ...(baseFilter.$and || []),
                { salaryMin: { $lte: maxS } },
                { salaryMax: { $gte: minS } },
            ];
        }

        if (minSalary) baseFilter.salaryMin = { $gte: Number(minSalary) };
        if (maxSalary) baseFilter.salaryMax = { $lte: Number(maxSalary) };

        console.log("🧱 Base Filter:", JSON.stringify(baseFilter));

        /* ---------------------------------------------------
         * 3️⃣ FETCH JOBS (PRIORITY LOGIC)
         * --------------------------------------------------- */
        let jobs = [];

        /* 🔥 PRIORITY 1: RADIUS SEARCH */
        if (geoEnabled) {
            console.log("📍 Radius search enabled");

            try {
                const nearbyCompanies = await CompanyProfile.aggregate([
                    {
                        $geoNear: {
                            near: {
                                type: "Point",
                                coordinates: [Number(lng), Number(lat)],
                            },
                            key: "googleLocation",
                            distanceField: "distance",
                            maxDistance: Number(radius) * 1000,
                            spherical: true,
                            query: {
                                "googleLocation.coordinates": { $ne: [0, 0] }, // IMPORTANT
                            },
                        },
                    },
                    { $project: { companyId: 1 } },
                ]);

                console.log("🏢 Nearby companies:", nearbyCompanies.length);

                const companyIds = nearbyCompanies.map(c => c.companyId);

                if (companyIds.length) {
                    jobs = await JobPost.find({
                        ...baseFilter,
                        companyId: { $in: companyIds },
                    })
                        .sort({
                            isFeatured: -1,
                            isPromoted: -1,
                            priorityScore: -1,
                            createdAt: -1,
                        })
                        .lean();
                }
            } catch (geoErr) {
                console.error("⚠️ Geo search failed, fallback enabled:", geoErr.message);
            }
        }

        /* 🏙 PRIORITY 2: CITY SEARCH */
        if (!jobs.length && city) {
            console.log("🏙 City fallback:", city);

            const cityCompanies = await CompanyProfile.find({
                city: new RegExp(`^${city}$`, "i"),
            }).select("companyId");

            const companyIds = cityCompanies.map(c => c.companyId);

            if (companyIds.length) {
                jobs = await JobPost.find({
                    ...baseFilter,
                    companyId: { $in: companyIds },
                }).lean();
            }
        }

        /* 🏞 PRIORITY 3: STATE SEARCH */
        if (!jobs.length && state) {
            console.log("🏞 State fallback:", state);

            const stateCompanies = await CompanyProfile.find({
                state: new RegExp(`^${state}$`, "i"),
            }).select("companyId");

            const companyIds = stateCompanies.map(c => c.companyId);

            if (companyIds.length) {
                jobs = await JobPost.find({
                    ...baseFilter,
                    companyId: { $in: companyIds },
                }).lean();
            }
        }

        /* 🔎 KEYWORD SEARCH */
        if (!jobs.length && q) {
            console.log("🔎 Keyword search:", q);

            jobs = await JobPost.find({
                ...baseFilter,
                $text: { $search: q },
            }).lean();
        }

        /* 🌍 FINAL FALLBACK */
        if (!jobs.length) {
            console.log("🌍 Global fallback (all jobs)");

            // Debug: Count total jobs in collection
            const totalInDb = await JobPost.countDocuments({});
            console.log("📊 Total jobs in database (no filter):", totalInDb);

            jobs = await JobPost.find(baseFilter)
                .sort({
                    isFeatured: -1,
                    isPromoted: -1,
                    priorityScore: -1,
                    createdAt: -1,
                })
                .lean();
        }

        console.log("📄 Jobs fetched:", jobs.length);

        /* ---------------------------------------------------
         * 4️⃣ BULK LOAD COMPANY DATA (UNCHANGED)
         * --------------------------------------------------- */
        const companyIds = [...new Set(jobs.map(j => String(j.companyId)))];

        const companyProfiles = await CompanyProfile.find({
            companyId: { $in: companyIds },
        }).lean();

        const companyLogins = await CompanyLogin.find({
            _id: { $in: companyIds },
            status: "active",
        })
            .select("name position email phone whatsAppNumber accountType companyName")
            .lean();

        const visibilitySettings = await CompanyProfileVisibility.find({
            companyId: { $in: companyIds },
        }).lean();

        const companyProfileMap = new Map(
            companyProfiles.map(c => [String(c.companyId), c])
        );

        const companyLoginMap = new Map(
            companyLogins.map(c => [String(c._id), c])
        );

        const visibilityMap = new Map(
            visibilitySettings.map(v => [String(v.companyId), v])
        );

        /* ---------------------------------------------------
         * 5️⃣ FINAL RESPONSE
         * --------------------------------------------------- */
        const finalJobs = jobs.map(job => {
            const mappedJob = mapCompany(job, companyProfileMap, companyLoginMap);
            const visibility = visibilityMap.get(String(job.companyId)) || null;
            return applyCompanyVisibility(mappedJob, visibility);
        });

        return res.json({
            success: true,
            total: finalJobs.length,
            jobs: finalJobs,
        });
    } catch (error) {
        console.error("❌ GET ALL JOBS ERROR:", error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
