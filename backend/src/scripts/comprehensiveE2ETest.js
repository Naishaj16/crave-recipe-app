require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

const API_BASE = "http://127.0.0.1:5001/api";
const SERVER_BASE = "http://127.0.0.1:5001";

async function runE2ETests() {
  console.log("===============================================================");
  console.log("         CRAVE COMPREHENSIVE END-TO-END AUDIT SUITE           ");
  console.log("===============================================================\n");

  const report = {
    passed: [],
    failed: [],
    bugsFound: [],
    inconsistencies: [],
  };

  function logPass(title, details) {
    report.passed.push({ title, details });
    console.log(`[PASS] ${title}: ${details}`);
  }

  function logBug(severity, title, details) {
    report.bugsFound.push({ severity, title, details });
    console.log(`[BUG - ${severity.toUpperCase()}] ${title}: ${details}`);
  }

  function logInconsistency(title, details) {
    report.inconsistencies.push({ title, details });
    console.log(`[INCONSISTENCY] ${title}: ${details}`);
  }

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: SYSTEM & DATABASE HEALTH
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 1: SYSTEM & DATABASE HEALTH ---");
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    if (healthRes.status === 200 && healthData.success) {
      logPass("Health Check Endpoint", "GET /api/health returned 200 OK");
    } else {
      logBug("high", "Health Check Failed", `Status: ${healthRes.status}`);
    }

    const dbTestRes = await fetch(`${API_BASE}/db-test`);
    const dbTestData = await dbTestRes.json();
    if (dbTestRes.status === 200 && dbTestData.success) {
      logPass("PostgreSQL Direct Test", `Database connected, time: ${dbTestData.time}`);
    } else {
      logBug("critical", "Database Connection Test Failed", `Status: ${dbTestRes.status}`);
    }

    // -------------------------------------------------------------------------
    // SECTION 2: AUTHENTICATION FLOWS & SECURITY
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 2: AUTHENTICATION & SECURITY ---");
    
    // 2.1 Valid Admin Login (Naisha is sole administrator)
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "naisha@test.com", password: "password123" }),
    });
    const adminLoginData = await adminLoginRes.json();
    let adminToken = adminLoginData.token;
    if (adminLoginRes.status === 200 && adminLoginData.user?.role === "admin") {
      logPass("Admin Authentication", `Logged in as ${adminLoginData.user.name} (Role: admin)`);
    } else {
      logBug("critical", "Admin Login Failed", JSON.stringify(adminLoginData));
    }

    // 2.2 Valid Standard User Login
    const userLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@test.com", password: "password123" }),
    });
    const userLoginData = await userLoginRes.json();
    let userToken = userLoginData.token;
    if (userLoginRes.status === 200 && userLoginData.user?.role === "user") {
      logPass("Standard User Authentication", `Logged in as ${userLoginData.user.name} (Role: user)`);
    } else {
      logBug("high", "Standard User Login Failed", JSON.stringify(userLoginData));
    }

    // 2.3 Wrong Password Rejection
    const wrongPassRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "naisha@test.com", password: "wrongpassword!!!" }),
    });
    if (wrongPassRes.status === 401) {
      logPass("Wrong Password Guard", "Returns 401 Unauthorized for incorrect password");
    } else {
      logBug("high", "Security Vulnerability", `Wrong password returned status ${wrongPassRes.status}`);
    }

    // 2.4 Non-existent User Rejection
    const nonExistRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody_exists_12345@test.com", password: "password123" }),
    });
    if (nonExistRes.status === 404) {
      logPass("Non-existent Account Guard", "Returns 404 for un-registered email");
    } else {
      logBug("medium", "Account Enumeration / Response mismatch", `Expected 404, got ${nonExistRes.status}`);
    }

    // 2.5 Signup with short password (< 8 chars)
    const shortPassRes = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Short Pass", email: "shortpass@test.com", password: "123" }),
    });
    if (shortPassRes.status === 400) {
      logPass("Password Length Validation", "Rejects passwords under 8 characters with 400 Bad Request");
    } else {
      logBug("high", "Weak Password Permitted", `Short password returned ${shortPassRes.status}`);
    }

    // 2.6 Disabled Account Login Check
    // Temporarily create a disabled user to test
    const testDisabledEmail = `disabled_${Date.now()}@test.com`;
    await pool.query(
      "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, 'user', 'disabled')",
      ["Disabled User", testDisabledEmail, adminLoginData.user?.password || "hash"]
    );
    const disabledLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testDisabledEmail, password: "password123" }),
    });
    if (disabledLoginRes.status === 403) {
      logPass("Disabled Account Login Block", "Disabled account blocked with 403 Forbidden");
    } else {
      logBug("critical", "Disabled User Can Log In", `Disabled account returned ${disabledLoginRes.status}`);
    }
    // Clean up temporary disabled user
    await pool.query("DELETE FROM users WHERE email = $1", [testDisabledEmail]);

    // 2.7 Logout Endpoint
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (logoutRes.status === 200) {
      logPass("Logout Audit Event", "POST /api/auth/logout returned 200 OK");
    } else {
      logBug("medium", "Logout Endpoint Failed", `Status: ${logoutRes.status}`);
    }

    // -------------------------------------------------------------------------
    // SECTION 3: ROLE-BASED ACCESS CONTROL (RBAC) & ADMIN APIs
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 3: RBAC & ADMIN API SECURITY ---");

    // 3.1 Unauthenticated Admin Access
    const unauthAdminRes = await fetch(`${API_BASE}/admin/stats`);
    if (unauthAdminRes.status === 401) {
      logPass("Unauthenticated Admin Route Guard", "GET /api/admin/stats without token returns 401");
    } else {
      logBug("critical", "Admin Route Unprotected", `Expected 401, got ${unauthAdminRes.status}`);
    }

    // 3.2 Non-Admin Token Calling Admin API
    const normalUserAdminRes = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (normalUserAdminRes.status === 403) {
      logPass("Non-Admin Token Rejection", "Standard user token rejected with 403 Forbidden");
    } else {
      logBug("critical", "Privilege Escalation Vulnerability", `Standard user accessed admin API: status ${normalUserAdminRes.status}`);
    }

    // 3.3 Admin Stats Accuracy against SQL
    const adminStatsRes = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await adminStatsRes.json();
    const actualUsers = parseInt((await pool.query("SELECT COUNT(*) FROM users")).rows[0].count, 10);
    const actualActiveRecipes = parseInt((await pool.query("SELECT COUNT(*) FROM recipes WHERE is_deleted = false")).rows[0].count, 10);
    const actualTrashedRecipes = parseInt((await pool.query("SELECT COUNT(*) FROM recipes WHERE is_deleted = true")).rows[0].count, 10);

    if (
      statsData.stats.totalUsers === actualUsers &&
      statsData.stats.activeRecipes === actualActiveRecipes &&
      statsData.stats.trashedRecipes === actualTrashedRecipes
    ) {
      logPass("Admin Stats DB Consistency", `Stats match PostgreSQL exactly (Users: ${actualUsers}, Active: ${actualActiveRecipes}, Trash: ${actualTrashedRecipes})`);
    } else {
      logBug("high", "Admin Stats Mismatch", `API stats: ${JSON.stringify(statsData.stats)} vs SQL: Users=${actualUsers}, Active=${actualActiveRecipes}`);
    }

    // 3.4 Self-Deactivation Guard (Admin cannot deactivate own account)
    const selfDeactivateRes = await fetch(`${API_BASE}/admin/users/${adminLoginData.user.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "disabled" }),
    });
    if (selfDeactivateRes.status === 400) {
      logPass("Admin Self-Lockout Protection", "Admin is blocked from deactivating their own account (400 Bad Request)");
    } else {
      logBug("high", "Admin Lockout Vulnerability", `Self-deactivate returned ${selfDeactivateRes.status}`);
    }

    // 3.5 Self-Deletion Guard (Admin cannot delete own account)
    const selfDeleteRes = await fetch(`${API_BASE}/admin/users/${adminLoginData.user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (selfDeleteRes.status === 400) {
      logPass("Admin Self-Deletion Protection", "Admin is blocked from deleting their own account (400 Bad Request)");
    } else {
      logBug("high", "Admin Self-Deletion Vulnerability", `Self-delete returned ${selfDeleteRes.status}`);
    }

    // 3.6 Sole Administrator Guard (Only Naisha can hold admin role)
    const promoteNonNaishaRes = await fetch(`${API_BASE}/admin/users/${userLoginData.user.id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: "admin" }),
    });
    if (promoteNonNaishaRes.status === 403) {
      logPass("Sole Admin Protection", "Only Naisha accounts can hold administrator privileges (403 Forbidden for other users)");
    } else {
      logBug("critical", "Admin Privilege Leak", `Non-Naisha promotion returned status ${promoteNonNaishaRes.status}`);
    }

    // 3.7 Admin Self-Demotion Guard (Admin cannot demote own account)
    const selfDemoteRes = await fetch(`${API_BASE}/admin/users/${adminLoginData.user.id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: "user" }),
    });
    if (selfDemoteRes.status === 400) {
      logPass("Admin Self-Demotion Protection", "Admin is blocked from demoting their own role (400 Bad Request)");
    } else {
      logBug("high", "Admin Self-Demotion Vulnerability", `Self-demote returned ${selfDemoteRes.status}`);
    }

    // -------------------------------------------------------------------------
    // SECTION 4: RECIPE CRUD & LIFECYCLE
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 4: RECIPE CRUD & LIFECYCLE ---");

    // 4.1 Public Recipe Feed
    const publicRecipesRes = await fetch(`${API_BASE}/recipes`);
    const publicRecipesData = await publicRecipesRes.json();
    if (publicRecipesRes.status === 200 && Array.isArray(publicRecipesData.recipes)) {
      logPass("Public Recipe Feed", `Fetched ${publicRecipesData.recipes.length} published recipes`);
    } else {
      logBug("critical", "Public Recipe Feed Failed", `Status: ${publicRecipesRes.status}`);
    }

    // 4.2 Create Recipe Without Token
    const unauthCreateRes = await fetch(`${API_BASE}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unauth Dish", category: "Healthy" }),
    });
    if (unauthCreateRes.status === 401) {
      logPass("Unauthenticated Recipe Creation Guard", "POST /api/recipes requires authentication (401)");
    } else {
      logBug("high", "Unauth Recipe Creation Allowed", `Status: ${unauthCreateRes.status}`);
    }

    // 4.3 Create Recipe With Token
    const testRecipeName = `E2E Risotto ${Date.now()}`;
    const createRes = await fetch(`${API_BASE}/recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: testRecipeName,
        description: "Silky saffron risotto with Parmigiano-Reggiano",
        category: "Italian",
        time_minutes: 28,
        image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800",
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ingredients: ["Arborio rice", "Saffron", "Shallots", "Butter", "Parmigiano"],
        instructions: ["Infuse saffron in warm stock", "Toast rice in butter", "Gradually add stock until al dente"],
      }),
    });
    const createData = await createRes.json();
    const createdRecipeId = createData.recipe?.id;

    if (createRes.status === 201 && createdRecipeId) {
      logPass("Authenticated Recipe Creation", `Created recipe ID ${createdRecipeId} tagged to user ID ${createData.recipe.user_id}`);
    } else {
      logBug("critical", "Recipe Creation Failed", JSON.stringify(createData));
    }

    // 4.4 Update Recipe (PUT)
    const updateRes = await fetch(`${API_BASE}/recipes/${createdRecipeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `${testRecipeName} (Updated)`,
        description: "Updated description with extra saffron notes",
        category: "Italian",
        time_minutes: 32,
        image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800",
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ingredients: ["Arborio rice", "Saffron threads", "Butter", "Parmigiano"],
        instructions: ["Step 1 updated", "Step 2 updated"],
      }),
    });
    const updateData = await updateRes.json();

    if (updateRes.status === 200 && updateData.recipe?.time_minutes === 32) {
      logPass("Recipe Update (PUT)", `Updated recipe ID ${createdRecipeId} successfully`);
    } else {
      logBug("high", "Recipe Update Failed", JSON.stringify(updateData));
    }

    // 4.4a Recipe Ownership Guard: Non-owner standard user cannot edit admin recipe
    const unauthEditRes = await fetch(`${API_BASE}/recipes/${createdRecipeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: "Malicious Edit By Other User" }),
    });
    if (unauthEditRes.status === 403) {
      logPass("Recipe Edit Ownership Guard", "Standard user cannot edit recipes owned by other users (403 Forbidden)");
    } else {
      logBug("critical", "Recipe Ownership Breach", `Expected 403 Forbidden on foreign recipe edit, got ${unauthEditRes.status}`);
    }

    // 4.4b Recipe Ownership Guard: Non-owner standard user cannot delete admin recipe
    const unauthDelRes = await fetch(`${API_BASE}/recipes/${createdRecipeId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (unauthDelRes.status === 403) {
      logPass("Recipe Delete Ownership Guard", "Standard user cannot delete recipes owned by other users (403 Forbidden)");
    } else {
      logBug("critical", "Recipe Delete Breach", `Expected 403 Forbidden on foreign recipe delete, got ${unauthDelRes.status}`);
    }

    // 4.4c Standard User Own Recipe Lifecycle: User creates, edits, and deletes their OWN recipe
    const userRecipeRes = await fetch(`${API_BASE}/recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        name: `User Own Dish ${Date.now()}`,
        category: "Healthy",
        time_minutes: 20,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
        instructions: ["Mix", "Serve"],
      }),
    });
    const userRecipeData = await userRecipeRes.json();
    const userRecipeId = userRecipeData.recipe?.id;

    if (userRecipeRes.status === 201 && userRecipeId) {
      // User edits their own recipe
      const userEditOwnRes = await fetch(`${API_BASE}/recipes/${userRecipeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: `User Own Dish (Modified)`,
          category: "Healthy",
          time_minutes: 25,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
        }),
      });
      // User deletes their own recipe
      const userDelOwnRes = await fetch(`${API_BASE}/recipes/${userRecipeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (userEditOwnRes.status === 200 && userDelOwnRes.status === 200) {
        logPass("User Own Recipe Authorization", "User successfully edited and deleted their own recipe");
      } else {
        logBug("high", "User Own Recipe Access Issue", `Edit status: ${userEditOwnRes.status}, Delete status: ${userDelOwnRes.status}`);
      }
    }

    // 4.5 Soft-Delete Recipe (Admin action)
    const softDelRes = await fetch(`${API_BASE}/recipes/${createdRecipeId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifySoftDel = await pool.query("SELECT is_deleted FROM recipes WHERE id = $1", [createdRecipeId]);

    if (softDelRes.status === 200 && verifySoftDel.rows[0]?.is_deleted === true) {
      logPass("Recipe Soft-Delete", `Recipe ID ${createdRecipeId} marked as is_deleted = true`);
    } else {
      logBug("critical", "Soft-Delete Failed", `DB status: ${verifySoftDel.rows[0]?.is_deleted}`);
    }

    // 4.6 Verification that Soft-Deleted Recipe is excluded from public feed
    const publicAfterDel = await (await fetch(`${API_BASE}/recipes`)).json();
    const isExposedPublicly = publicAfterDel.recipes.some((r) => r.id === createdRecipeId);
    if (!isExposedPublicly) {
      logPass("Soft-Deleted Public Exclusion", "Deleted recipe is strictly excluded from GET /api/recipes");
    } else {
      logBug("critical", "Data Leak", "Soft-deleted recipe still returned by public feed!");
    }

    // 4.7 Restore Recipe via Admin API
    const restoreRes = await fetch(`${API_BASE}/admin/recipes/${createdRecipeId}/restore`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyRestored = await pool.query("SELECT is_deleted FROM recipes WHERE id = $1", [createdRecipeId]);
    if (restoreRes.status === 200 && verifyRestored.rows[0]?.is_deleted === false) {
      logPass("Admin Recipe Restore", `Recipe ID ${createdRecipeId} restored to active status (is_deleted = false)`);
    } else {
      logBug("high", "Recipe Restore Failed", `Status: ${restoreRes.status}`);
    }

    // 4.8 Permanent Purge via Admin API
    const purgeRes = await fetch(`${API_BASE}/admin/recipes/${createdRecipeId}/permanent`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyPurged = await pool.query("SELECT * FROM recipes WHERE id = $1", [createdRecipeId]);
    if (purgeRes.status === 200 && verifyPurged.rows.length === 0) {
      logPass("Admin Recipe Permanent Purge", `Recipe ID ${createdRecipeId} completely removed from database`);
    } else {
      logBug("high", "Permanent Purge Failed", `Found ${verifyPurged.rows.length} rows remaining`);
    }

    // -------------------------------------------------------------------------
    // SECTION 5: MEDIA UPLOAD & COMPRESSION
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 5: MEDIA UPLOAD & STATIC SERVING ---");

    // 5.1 Image Upload
    const tempImgPath = "/tmp/e2e-test-photo.jpg";
    fs.writeFileSync(tempImgPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])); // minimal JPEG header
    
    const imgBlob = new Blob([fs.readFileSync(tempImgPath)], { type: "image/jpeg" });
    const imgFormData = new FormData();
    imgFormData.append("file", imgBlob, "test-photo.jpg");

    const imgUploadRes = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: imgFormData,
    });
    const imgUploadData = await imgUploadRes.json();

    if (imgUploadRes.status === 200 && imgUploadData.url && imgUploadData.url.startsWith("http")) {
      logPass("Image Upload API", `Uploaded JPEG successfully: ${imgUploadData.url}`);

      // Verify file is actually readable from Express static server
      const staticCheckRes = await fetch(imgUploadData.url);
      if (staticCheckRes.status === 200) {
        logPass("Static Media Serving", `Verified HTTP 200 OK fetching uploaded file directly from /uploads/`);
      } else {
        logBug("high", "Uploaded File Not Accessible", `Fetching ${imgUploadData.url} returned status ${staticCheckRes.status}`);
      }
    } else {
      logBug("high", "Image Upload Failed", JSON.stringify(imgUploadData));
    }

    // 5.2 Video Upload
    const tempVideoPath = "/tmp/e2e-test-video.mp4";
    fs.writeFileSync(tempVideoPath, Buffer.from("fake-mp4-stream-data-header"));
    const videoBlob = new Blob([fs.readFileSync(tempVideoPath)], { type: "video/mp4" });
    const videoFormData = new FormData();
    videoFormData.append("file", videoBlob, "test-video.mp4");

    const videoUploadRes = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: videoFormData,
    });
    const videoUploadData = await videoUploadRes.json();
    if (videoUploadRes.status === 200 && videoUploadData.url) {
      logPass("Video Upload API", `Uploaded MP4 successfully: ${videoUploadData.url}`);
    } else {
      logBug("high", "Video Upload Failed", JSON.stringify(videoUploadData));
    }

    // 5.3 Invalid File Type Rejection
    const txtBlob = new Blob(["malicious text"], { type: "text/plain" });
    const txtFormData = new FormData();
    txtFormData.append("file", txtBlob, "bad-file.txt");

    const txtUploadRes = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: txtFormData,
    });
    if (txtUploadRes.status !== 200) {
      logPass("Upload Security Filter", "Blocked non-image/video MIME type with error response");
    } else {
      logBug("high", "Upload MIME Filter Bypass", "Allowed non-image/video file upload!");
    }

    // -------------------------------------------------------------------------
    // SECTION 6: FAVORITES SYSTEM
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 6: FAVORITES SYSTEM ---");

    const favsRes = await fetch(`${API_BASE}/favorites`);
    const favsData = await favsRes.json();
    if (favsRes.status === 200 && Array.isArray(favsData.favorites)) {
      logPass("Get Favorites", `Fetched ${favsData.favorites.length} favorited recipes`);
    } else {
      logBug("high", "Get Favorites Failed", `Status: ${favsRes.status}`);
    }

    // -------------------------------------------------------------------------
    // SECTION 7: AUDIT LOGS IN POSTGRESQL
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 7: AUDIT LOG INTEGRITY ---");
    const activityLogsRes = await fetch(`${API_BASE}/admin/activity`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const activityLogsData = await activityLogsRes.json();
    if (activityLogsRes.status === 200 && activityLogsData.activities.length > 0) {
      const distinctActions = [...new Set(activityLogsData.activities.map((a) => a.action))];
      logPass("Persistent Audit Trail", `Logged ${activityLogsData.activities.length} real events across actions: ${distinctActions.join(", ")}`);
    } else {
      logBug("high", "Audit Logs Empty", "No activity logs returned by admin endpoint");
    }

    // -------------------------------------------------------------------------
    // SECTION 8: FRONTEND / DATABASE INCONSISTENCY INSPECTION
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 8: CODE & DATA INTEGRITY SCRUTINY ---");

    // Check recipes with empty images in DB
    const emptyImgRecipes = await pool.query("SELECT id, name FROM recipes WHERE image IS NULL OR TRIM(image) = ''");
    if (emptyImgRecipes.rows.length > 0) {
      logInconsistency(
        "Recipes with missing image",
        `Found ${emptyImgRecipes.rows.length} recipe(s) with empty image in DB (e.g. ID ${emptyImgRecipes.rows[0].id}: "${emptyImgRecipes.rows[0].name}"). Frontend card renders a broken/missing img tag if not guarded by fallback placeholder.`
      );
    } else {
      logPass("Recipe Images", "All recipes have valid image URLs");
    }

    // Check recipe categories in DB vs frontend filters
    const dbCategories = await pool.query("SELECT DISTINCT category FROM recipes");
    const dbCatList = dbCategories.rows.map((r) => r.category);
    logPass("Category Inventory", `Categories found in DB: ${dbCatList.join(", ")}`);

    console.log("\n===============================================================");
    console.log(`E2E AUDIT FINISHED: ${report.passed.length} Passed, ${report.bugsFound.length} Bugs, ${report.inconsistencies.length} Inconsistencies`);
    console.log("===============================================================\n");

    console.log("FULL SUMMARY JSON:");
    console.log(JSON.stringify(report, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("FATAL AUDIT FAILURE:", err);
    process.exit(1);
  }
}

runE2ETests();

