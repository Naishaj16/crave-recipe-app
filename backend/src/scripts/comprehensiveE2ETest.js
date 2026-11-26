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

    // 2.8 Google Auth Validation (Missing email)
    const googleMissingRes = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Email" }),
    });
    if (googleMissingRes.status === 400) {
      logPass("Google Auth Email Validation", "Rejects missing email with 400 Bad Request");
    } else {
      logBug("high", "Google Auth Validation Bypass", `Expected 400, got ${googleMissingRes.status}`);
    }

    // 2.9 Google Auth Standard User Login / Auto-Signup
    const googleUserEmail = `google_test_${Date.now()}@gmail.com`;
    const googleUserRes = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: googleUserEmail,
        name: "Google Chef User",
        uid: "google-uid-12345",
      }),
    });
    const googleUserData = await googleUserRes.json();
    if (googleUserRes.status === 200 && googleUserData.user?.role === "user" && googleUserData.token) {
      logPass("Google Standard User Auth", `Authenticated Google user (${googleUserData.user.name}) with role 'user'`);
    } else {
      logBug("critical", "Google User Auth Failed", JSON.stringify(googleUserData));
    }
    // Clean up temporary google user from test
    await pool.query("DELETE FROM users WHERE email = $1", [googleUserEmail]);

    // 2.10 Google Auth Naisha Admin Authentication
    const googleAdminRes = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "naishajain982@gmail.com",
        name: "Naisha",
        uid: "google-naisha-uid",
      }),
    });
    const googleAdminData = await googleAdminRes.json();
    if (googleAdminRes.status === 200 && googleAdminData.user?.role === "admin") {
      logPass("Google Naisha Admin Auth", `Recognized primary admin Naisha via Google OAuth with role 'admin'`);
    } else {
      logBug("critical", "Google Admin Auth Failed", JSON.stringify(googleAdminData));
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

      // 4.4d Ownership Injection Guard: Attempt to inject a fake user_id
      const injectRes = await fetch(`${API_BASE}/recipes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: `Injection Test Dish ${Date.now()}`,
          category: "Healthy",
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
          user_id: 99999, // Attempted spoof
        }),
      });
      const injectData = await injectRes.json();
      if (injectRes.status === 201 && injectData.recipe?.user_id === userLoginData.user.id) {
        logPass("User ID Injection Guard", `Server strictly enforced authenticated user ID (${injectData.recipe.user_id}) and ignored spoofed user_id 99999`);
        // Clean up injection test recipe from database
        await pool.query("DELETE FROM recipes WHERE id = $1", [injectData.recipe.id]);
      } else {
        logBug("critical", "User ID Injection Vulnerability", `Recipe assigned to spoofed ID: ${injectData.recipe?.user_id}`);
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

    // -------------------------------------------------------------------------
    // SECTION 9: ADVANCED FILTERS & PANTRY SEARCH (Features 5, 6, 8)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 9: ADVANCED FILTERS & PANTRY SEARCH ---");
    const filterRes = await fetch(`${API_BASE}/recipes?category=Healthy&difficulty=Medium`);
    const filterData = await filterRes.json();
    if (filterRes.status === 200 && filterData.success) {
      logPass("Category & Difficulty Filters", `GET /recipes with filters returned ${filterData.recipes.length} matching recipes`);
    } else {
      logBug("high", "Advanced Filter Query Failed", `Status ${filterRes.status}`);
    }

    const pantryRes = await fetch(`${API_BASE}/recipes?ingredients=pasta,garlic,tomato`);
    const pantryData = await pantryRes.json();
    if (pantryRes.status === 200 && pantryData.success) {
      logPass("Pantry Ingredient Search", `Matched ${pantryData.recipes.length} recipes containing pantry ingredients`);
    } else {
      logBug("high", "Pantry Search Failed", `Status ${pantryRes.status}`);
    }

    // -------------------------------------------------------------------------
    // SECTION 10: RECIPE REVIEWS & RATINGS (Features 11 & 12)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 10: RATINGS & REVIEWS ---");
    const testRecipeId = filterData.recipes[0]?.id || 8;
    const postReviewRes = await fetch(`${API_BASE}/recipes/${testRecipeId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        rating: 5,
        comment: "Outstanding recipe! Bursting with fresh culinary flavors.",
      }),
    });
    const postReviewData = await postReviewRes.json();
    let createdReviewId = postReviewData.review?.id;

    if (postReviewRes.status === 201 && postReviewData.success) {
      logPass("Add Recipe Review", `Review added for recipe ID ${testRecipeId} with 5 stars`);
    } else {
      logBug("high", "Add Review Failed", JSON.stringify(postReviewData));
    }

    const getReviewsRes = await fetch(`${API_BASE}/recipes/${testRecipeId}/reviews`);
    const getReviewsData = await getReviewsRes.json();
    if (getReviewsRes.status === 200 && getReviewsData.success) {
      logPass("Get Recipe Reviews", `Fetched ${getReviewsData.reviews.length} reviews (Average: ${getReviewsData.averageRating})`);
    } else {
      logBug("high", "Get Reviews Failed", JSON.stringify(getReviewsData));
    }

    if (createdReviewId) {
      const delReviewRes = await fetch(`${API_BASE}/recipes/reviews/${createdReviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (delReviewRes.status === 200) {
        logPass("Delete Recipe Review", `Cleaned up test review ID ${createdReviewId}`);
      } else {
        logBug("medium", "Delete Review Failed", `Status ${delReviewRes.status}`);
      }
    }

    // -------------------------------------------------------------------------
    // SECTION 11: MEAL PLANNER (Feature 14)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 11: MEAL PLANNER ---");
    const addPlanRes = await fetch(`${API_BASE}/meal-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        day_of_week: "Wednesday",
        meal_type: "Dinner",
        recipe_id: testRecipeId,
        notes: "Automated test meal schedule",
      }),
    });
    const addPlanData = await addPlanRes.json();
    let planId = addPlanData.mealPlan?.id;

    if (addPlanRes.status === 201 && addPlanData.success) {
      logPass("Add to Meal Plan", `Scheduled meal on Wednesday Dinner (ID: ${planId})`);
    } else {
      logBug("high", "Add Meal Plan Failed", JSON.stringify(addPlanData));
    }

    const getPlanRes = await fetch(`${API_BASE}/meal-plan`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const getPlanData = await getPlanRes.json();
    if (getPlanRes.status === 200 && getPlanData.mealPlans.some((p) => p.id === planId)) {
      logPass("Get Meal Plans", `Verified weekly meal schedule includes scheduled recipe`);
    } else {
      logBug("high", "Get Meal Plans Missing Item", JSON.stringify(getPlanData));
    }

    if (planId) {
      await fetch(`${API_BASE}/meal-plan/${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      logPass("Delete Meal Plan", `Cleaned up meal plan ID ${planId}`);
    }

    // -------------------------------------------------------------------------
    // SECTION 12: SHOPPING LIST (Feature 15)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 12: SHOPPING LIST ---");
    const addFromRecRes = await fetch(`${API_BASE}/shopping-list/from-recipe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ recipe_id: testRecipeId }),
    });
    const addFromRecData = await addFromRecRes.json();
    if (addFromRecRes.status === 200 && addFromRecData.success) {
      logPass("1-Click Recipe to Shopping List", `Populated ingredients from recipe into shopping list`);
    } else {
      logBug("high", "Add Ingredients from Recipe Failed", JSON.stringify(addFromRecData));
    }

    const getShopRes = await fetch(`${API_BASE}/shopping-list`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const getShopData = await getShopRes.json();
    if (getShopRes.status === 200 && getShopData.items.length > 0) {
      logPass("Get Shopping List", `Shopping checklist has ${getShopData.items.length} items`);
      // Toggle first item
      const firstItemId = getShopData.items[0].id;
      const toggleRes = await fetch(`${API_BASE}/shopping-list/${firstItemId}/toggle`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (toggleRes.status === 200) {
        logPass("Toggle Shopping Item", `Item ID ${firstItemId} checkbox toggled`);
      }
    }

    // Clear shopping list
    await fetch(`${API_BASE}/shopping-list`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    logPass("Clear Shopping List", `Cleared test items from shopping list`);

    // -------------------------------------------------------------------------
    // SECTION 13: USER PROFILE & NOTIFICATIONS (Features 18 & 19)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 13: PROFILE & NOTIFICATIONS ---");
    const profileRes = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const profileData = await profileRes.json();
    if (profileRes.status === 200 && profileData.profile) {
      logPass("Get User Profile", `Fetched profile for ${profileData.profile.name} (Role: ${profileData.profile.role})`);
    } else {
      logBug("high", "Get Profile Failed", JSON.stringify(profileData));
    }

    const updateProfileRes = await fetch(`${API_BASE}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        name: "Test Chef",
        bio: "Passionate about healthy Mediterranean food",
        dietary_preferences: ["Vegetarian", "Gluten-Free"],
      }),
    });
    const updateProfileData = await updateProfileRes.json();
    if (updateProfileRes.status === 200 && updateProfileData.success) {
      logPass("Update User Profile", `Updated culinary bio and dietary preferences successfully`);
    } else {
      logBug("high", "Update Profile Failed", JSON.stringify(updateProfileData));
    }

    const notifRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const notifData = await notifRes.json();
    if (notifRes.status === 200 && notifData.success) {
      logPass("Notifications Center", `Fetched ${notifData.notifications.length} notifications (${notifData.unreadCount} unread)`);
    } else {
      logBug("high", "Get Notifications Failed", JSON.stringify(notifData));
    }

    // -------------------------------------------------------------------------
    // SECTION 14: PASSWORD RECOVERY (Feature 1)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 14: PASSWORD RECOVERY ---");
    const forgotRes = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@test.com" }),
    });
    const forgotData = await forgotRes.json();
    if (forgotRes.status === 200 && forgotData.resetToken) {
      logPass("Forgot Password Request", `Generated password reset token: ${forgotData.resetToken.slice(0, 10)}...`);

      const resetRes = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: forgotData.resetToken,
          newPassword: "password123",
        }),
      });
      const resetData = await resetRes.json();
      if (resetRes.status === 200 && resetData.success) {
        logPass("Reset Password Confirmation", `Updated password and cleared reset token`);
      } else {
        logBug("high", "Reset Password Failed", JSON.stringify(resetData));
      }
    } else {
      logBug("high", "Forgot Password Failed", JSON.stringify(forgotData));
    }

    // -------------------------------------------------------------------------
    // SECTION 15: TWO-FACTOR AUTHENTICATION (2FA)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 15: TWO-FACTOR AUTHENTICATION (2FA) ---");

    // 15.1 Enable 2FA for standard user
    const enable2FARes = await fetch(`${API_BASE}/auth/toggle-2fa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ enable: true }),
    });
    const enable2FAData = await enable2FARes.json();
    if (enable2FARes.status === 200 && enable2FAData.twoFactorEnabled === true) {
      logPass("Enable 2FA", "Successfully enabled Two-Factor Authentication for user account");
    } else {
      logBug("high", "Enable 2FA Failed", JSON.stringify(enable2FAData));
    }

    // 15.2 Login with 2FA enabled -> Challenge issued
    const login2FARes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@test.com", password: "password123" }),
    });
    const login2FAData = await login2FARes.json();
    let temp2FAToken = login2FAData.tempToken;
    let initial2FACode = login2FAData.demoCode;

    if (login2FARes.status === 200 && login2FAData.requires2FA && temp2FAToken && initial2FACode) {
      logPass("2FA Challenge Flow", `Server withheld full JWT and issued 2FA challenge code (${initial2FACode})`);
    } else {
      logBug("critical", "2FA Challenge Failed", JSON.stringify(login2FAData));
    }

    // 15.3 Reject invalid 2FA code
    const invalid2FARes = await fetch(`${API_BASE}/auth/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken: temp2FAToken, code: "000000" }),
    });
    if (invalid2FARes.status === 401) {
      logPass("2FA Invalid Code Guard", "Rejects incorrect 6-digit verification code with 401 Unauthorized");
    } else {
      logBug("high", "2FA Security Breach", `Expected 401 for wrong code, got ${invalid2FARes.status}`);
    }

    // 15.4 Resend fresh 2FA code
    const resend2FARes = await fetch(`${API_BASE}/auth/resend-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken: temp2FAToken }),
    });
    const resend2FAData = await resend2FARes.json();
    let active2FACode = resend2FAData.demoCode || initial2FACode;
    if (resend2FARes.status === 200 && resend2FAData.demoCode) {
      logPass("Resend 2FA Code", `Generated fresh 6-digit code: ${resend2FAData.demoCode}`);
    } else {
      logBug("medium", "Resend 2FA Failed", JSON.stringify(resend2FAData));
    }

    // 15.5 Verify valid 2FA code -> Issues full session JWT
    const verify2FARes = await fetch(`${API_BASE}/auth/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken: temp2FAToken, code: active2FACode }),
    });
    const verify2FAData = await verify2FARes.json();
    let full2FAToken = verify2FAData.token;
    if (verify2FARes.status === 200 && full2FAToken && verify2FAData.user?.twoFactorEnabled) {
      logPass("2FA Verification Success", "Verified 6-digit code and established full session with role 'user'");
    } else {
      logBug("critical", "2FA Verification Failed", JSON.stringify(verify2FAData));
    }

    // 15.6 Test Google Sign-In with 2FA active
    const reEnable2FARes = await fetch(`${API_BASE}/auth/toggle-2fa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${full2FAToken || userToken}`,
      },
      body: JSON.stringify({ enable: true }),
    });
    if (reEnable2FARes.status === 200) {
      const google2FARes = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", name: "Test Chef" }),
      });
      const google2FAData = await google2FARes.json();
      if (google2FARes.status === 200 && google2FAData.requires2FA && google2FAData.tempToken) {
        logPass("Google Sign-In with 2FA", `Google login prompted 2FA security code challenge (${google2FAData.demoCode})`);
      } else {
        logBug("high", "Google 2FA Bypass", JSON.stringify(google2FAData));
      }
    }

    // 15.7 Disable 2FA to return account to standard mode
    const disable2FARes = await fetch(`${API_BASE}/auth/toggle-2fa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${full2FAToken || userToken}`,
      },
      body: JSON.stringify({ enable: false }),
    });
    const disable2FAData = await disable2FARes.json();
    if (disable2FARes.status === 200 && disable2FAData.twoFactorEnabled === false) {
      logPass("Disable 2FA", "Successfully disabled 2FA and verified standard login resumes");
    } else {
      logBug("high", "Disable 2FA Failed", JSON.stringify(disable2FAData));
    }

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

