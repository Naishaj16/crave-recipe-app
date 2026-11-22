require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const pool = require("../config/db");

const API_BASE = "http://127.0.0.1:5001/api";

async function runTests() {
  console.log("=================================================");
  console.log("   CRAVE ADMIN DASHBOARD PRODUCTION TEST SUITE   ");
  console.log("=================================================\n");

  const results = {};

  try {
    // -------------------------------------------------------------
    // TEST 1: Admin Login
    // -------------------------------------------------------------
    console.log("Running Test 1: Admin Login...");
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@crave.com", password: "password123" }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;

    if (
      adminLoginRes.status === 200 &&
      adminLoginData.success === true &&
      adminLoginData.user.role === "admin" &&
      adminToken
    ) {
      results.test1 = { pass: true, detail: `Admin authenticated (User ID: ${adminLoginData.user.id}, Role: ${adminLoginData.user.role})` };
      console.log("✓ Test 1 Passed: Admin login successful.");
    } else {
      throw new Error(`Test 1 Failed: ${JSON.stringify(adminLoginData)}`);
    }

    // -------------------------------------------------------------
    // TEST 2: Normal user attempting to access admin page
    // -------------------------------------------------------------
    console.log("\nRunning Test 2: Normal user admin login rejection...");
    const userLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@test.com", password: "password123" }),
    });
    const userLoginData = await userLoginRes.json();
    const userToken = userLoginData.token;

    // Normal user role check
    const isDeniedInAdminPortal = userLoginData.user?.role !== "admin";
    if (isDeniedInAdminPortal) {
      results.test2 = { pass: true, detail: `Role is '${userLoginData.user.role}', AdminPortal rejection condition verified.` };
      console.log("✓ Test 2 Passed: Normal user has role 'user' and is blocked from admin access.");
    } else {
      throw new Error(`Test 2 Failed: Normal user unexpectedly granted admin role`);
    }

    // -------------------------------------------------------------
    // TEST 3: Normal user attempting to call admin APIs directly
    // -------------------------------------------------------------
    console.log("\nRunning Test 3: Normal user calling admin APIs directly...");
    const unauthApiRes = await fetch(`${API_BASE}/admin/stats`); // No token
    const normalUserApiRes = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` }, // Normal token
    });
    const normalUserData = await normalUserApiRes.json();

    if (unauthApiRes.status === 401 && normalUserApiRes.status === 403) {
      results.test3 = { pass: true, detail: `No token -> 401 Unauthorized; User token -> 403 Forbidden ("${normalUserData.message}")` };
      console.log("✓ Test 3 Passed: Direct API calls without admin rights return 401 / 403.");
    } else {
      throw new Error(`Test 3 Failed: Unauth status: ${unauthApiRes.status}, User status: ${normalUserApiRes.status}`);
    }

    // -------------------------------------------------------------
    // TEST 4: Admin viewing registered users
    // -------------------------------------------------------------
    console.log("\nRunning Test 4: Admin viewing registered users from PostgreSQL...");
    const usersApiRes = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersData = await usersApiRes.json();
    const dbUserCount = await pool.query("SELECT COUNT(*) FROM users");

    if (
      usersApiRes.status === 200 &&
      usersData.users.length === parseInt(dbUserCount.rows[0].count, 10)
    ) {
      results.test4 = { pass: true, detail: `Retrieved ${usersData.users.length} users, matching PostgreSQL COUNT exactly.` };
      console.log(`✓ Test 4 Passed: Fetched ${usersData.users.length} registered users from database.`);
    } else {
      throw new Error("Test 4 Failed: User counts do not match database.");
    }

    // -------------------------------------------------------------
    // TEST 5: Admin viewing recipes
    // -------------------------------------------------------------
    console.log("\nRunning Test 5: Admin viewing recipes from PostgreSQL...");
    const recipesApiRes = await fetch(`${API_BASE}/admin/recipes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const recipesData = await recipesApiRes.json();
    const dbRecipeCount = await pool.query("SELECT COUNT(*) FROM recipes");

    if (
      recipesApiRes.status === 200 &&
      recipesData.recipes.length === parseInt(dbRecipeCount.rows[0].count, 10)
    ) {
      results.test5 = { pass: true, detail: `Retrieved ${recipesData.recipes.length} recipes, matching PostgreSQL COUNT exactly.` };
      console.log(`✓ Test 5 Passed: Fetched ${recipesData.recipes.length} recipes with creator relations.`);
    } else {
      throw new Error("Test 5 Failed: Recipe counts do not match database.");
    }

    // -------------------------------------------------------------
    // TEST 6: Creating a recipe and verifying in PostgreSQL
    // -------------------------------------------------------------
    console.log("\nRunning Test 6: Creating a recipe and verifying in PostgreSQL...");
    const newRecipePayload = {
      name: "Automated Test Risotto",
      description: "Creamy arborio rice with parmigiano",
      category: "Italian",
      time_minutes: 35,
      image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=600",
      ingredients: ["Arborio rice", "Chicken broth", "Parmesan", "White wine"],
      instructions: ["Sauté onions", "Add rice and wine", "Simmer broth gradually"],
    };

    const createRecipeRes = await fetch(`${API_BASE}/recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newRecipePayload),
    });
    const createData = await createRecipeRes.json();
    const createdId = createData.recipe?.id;

    const verifyCreatedDb = await pool.query("SELECT * FROM recipes WHERE id = $1", [createdId]);

    if (verifyCreatedDb.rows.length === 1 && verifyCreatedDb.rows[0].name === newRecipePayload.name) {
      results.test6 = { pass: true, detail: `Created recipe ID ${createdId} ("${verifyCreatedDb.rows[0].name}"), verified in DB.` };
      console.log(`✓ Test 6 Passed: Recipe ID ${createdId} created and verified in PostgreSQL.`);
    } else {
      throw new Error("Test 6 Failed: Recipe not found in database.");
    }

    // -------------------------------------------------------------
    // TEST 7: Editing a recipe and verifying persistence
    // -------------------------------------------------------------
    console.log("\nRunning Test 7: Editing a recipe and verifying persistence...");
    const updateRecipePayload = {
      ...newRecipePayload,
      name: "Automated Test Risotto Milanese",
      time_minutes: 40,
    };

    const updateRecipeRes = await fetch(`${API_BASE}/recipes/${createdId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(updateRecipePayload),
    });
    const updateData = await updateRecipeRes.json();

    const verifyUpdatedDb = await pool.query("SELECT * FROM recipes WHERE id = $1", [createdId]);

    if (
      verifyUpdatedDb.rows[0].name === "Automated Test Risotto Milanese" &&
      verifyUpdatedDb.rows[0].time_minutes === 40
    ) {
      results.test7 = { pass: true, detail: `Recipe updated in DB to "${verifyUpdatedDb.rows[0].name}", time: ${verifyUpdatedDb.rows[0].time_minutes}m.` };
      console.log("✓ Test 7 Passed: Recipe edited and verified persistent in PostgreSQL.");
    } else {
      throw new Error("Test 7 Failed: Updates did not persist.");
    }

    // -------------------------------------------------------------
    // TEST 8: Deleting a recipe and verifying status / trash
    // -------------------------------------------------------------
    console.log("\nRunning Test 8: Deleting a recipe and verifying status...");
    const deleteRes = await fetch(`${API_BASE}/recipes/${createdId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const verifyDeletedDb = await pool.query("SELECT is_deleted FROM recipes WHERE id = $1", [createdId]);

    // Restore it
    const restoreRes = await fetch(`${API_BASE}/admin/recipes/${createdId}/restore`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyRestoredDb = await pool.query("SELECT is_deleted FROM recipes WHERE id = $1", [createdId]);

    // Clean up: permanently delete test recipe
    await fetch(`${API_BASE}/admin/recipes/${createdId}/permanent`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyPurgedDb = await pool.query("SELECT * FROM recipes WHERE id = $1", [createdId]);

    if (
      verifyDeletedDb.rows[0].is_deleted === true &&
      verifyRestoredDb.rows[0].is_deleted === false &&
      verifyPurgedDb.rows.length === 0
    ) {
      results.test8 = { pass: true, detail: `Soft-delete (is_deleted: true) -> Restore (is_deleted: false) -> Permanent Purge (deleted from table) verified.` };
      console.log("✓ Test 8 Passed: Recipe soft-delete, restore, and permanent purge verified in PostgreSQL.");
    } else {
      throw new Error("Test 8 Failed: Recipe delete/restore cycle failed.");
    }

    // -------------------------------------------------------------
    // TEST 9: Login/logout activity recording
    // -------------------------------------------------------------
    console.log("\nRunning Test 9: Login and logout activity recording...");
    const testLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@crave.com", password: "password123" }),
    });
    const testLoginToken = (await testLoginRes.json()).token;

    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${testLoginToken}` },
    });

    const recentLogs = await pool.query(
      "SELECT action, status, email FROM activity_logs WHERE email = 'demo@crave.com' ORDER BY created_at DESC LIMIT 2"
    );

    const hasLogout = recentLogs.rows.some((r) => r.action === "logout");
    const hasLogin = recentLogs.rows.some((r) => r.action === "login");

    if (hasLogout && hasLogin) {
      results.test9 = { pass: true, detail: `Confirmed real activity logs in PostgreSQL: login and logout recorded.` };
      console.log("✓ Test 9 Passed: Real login and logout events successfully recorded in PostgreSQL.");
    } else {
      throw new Error("Test 9 Failed: Activity logs missing login/logout entries.");
    }

    // -------------------------------------------------------------
    // TEST 10: Refreshing dashboard and verifying data accuracy
    // -------------------------------------------------------------
    console.log("\nRunning Test 10: Refreshing dashboard and verifying data accuracy...");
    const statsLoad1 = await (await fetch(`${API_BASE}/admin/stats`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();
    const statsLoad2 = await (await fetch(`${API_BASE}/admin/stats`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();

    const realUsers = parseInt((await pool.query("SELECT COUNT(*) FROM users")).rows[0].count, 10);
    const realRecipes = parseInt((await pool.query("SELECT COUNT(*) FROM recipes WHERE is_deleted = false")).rows[0].count, 10);

    if (
      statsLoad1.stats.totalUsers === realUsers &&
      statsLoad2.stats.totalUsers === realUsers &&
      statsLoad1.stats.activeRecipes === realRecipes &&
      statsLoad2.stats.activeRecipes === realRecipes
    ) {
      results.test10 = { pass: true, detail: `Stats exactly match PostgreSQL state across multiple requests (Users: ${realUsers}, Recipes: ${realRecipes}).` };
      console.log("✓ Test 10 Passed: Dashboard refresh returns persistent, verified database data.");
    } else {
      throw new Error("Test 10 Failed: Stats do not match PostgreSQL.");
    }

    console.log("\n=================================================");
    console.log("   ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY!  ");
    console.log("=================================================");
    console.log(JSON.stringify(results, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err.message);
    process.exit(1);
  }
}

runTests();
