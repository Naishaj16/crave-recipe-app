# Crave Recipe App — Frontend Project Submission

**Developer**: Naisha Jain  
**Project**: Crave Recipe Application (Frontend Client)  
**Date**: November 2026  
**Submitted To**: Mentor / Technical Reviewer  
**Stack**: React 19, TypeScript, Vite, Vanilla CSS3 (Custom Design System), HTML5 Canvas API  
**Local App URL**: `http://localhost:5173/`  
**Admin Portal URL**: `http://localhost:5173/admin`  

---

## 1. Design Direction & Aesthetic Choices

Hi! This document explains how I designed and built the frontend for Crave.

Right from the start, I wanted to avoid the generic "AI dashboard" look that a lot of template generators produce. I didn't want floating neon cards, purple gradients, glowing borders, or random decorative emojis everywhere. Food applications need to feel warm, clean, and appetizing—not like a crypto dashboard.

### Key visual decisions I made:
- **Warm, earthy neutral palette**: Used soft off-white backgrounds (`#fafaf8`), light beige containers (`#f4f3ed`), and muted olive/forest greens (`#4a6341`) for action buttons and brand marks.
- **Thoughtful typography**: Paired clean serif headers for recipe names and section titles with crisp, readable sans-serif fonts for ingredient lists, instructions, and cooking times.
- **Strict public separation**: The public homepage (`/`) is 100% focused on discovering and saving recipes. I intentionally kept all admin controls, metrics, and role toggles off the public interface. The admin panel lives strictly under `/admin` and requires valid administrator credentials to open.

---

## 2. Project Architecture & Component Breakdown

I structured the frontend into modular components and single-responsibility utility files:

```text
src/
├── components/
│   ├── LoginDashboard.tsx     # Entry Login Dashboard (shown first before recipes)
│   ├── UserDashboard.tsx      # Authenticated user dashboard with stats & quick actions
│   ├── AdminPortal.tsx        # Self-contained admin console (Overview, Users, Activity, Recipes)
│   ├── RecipeEditModal.tsx    # Recipe editing dialog with live media previews & file pickers
│   ├── VideoPlayer.tsx        # Multi-provider video parser (Instagram, YouTube, Vimeo, direct MP4)
│   └── AuthModal.tsx          # Standalone modal for guest login & signup
├── context/
│   └── AuthContext.tsx        # Global auth state, JWT persistence, and server-notified logout
├── services/
│   ├── recipeService.ts       # Public recipe CRUD and favorites API calls
│   ├── authService.ts         # Authentication API calls
│   └── adminService.ts        # Admin management endpoints
├── utils/
│   └── mediaUtils.ts          # Client-side HTML5 canvas compression and file upload helper
├── App.tsx                    # Root flow: Login Dashboard -> User Dashboard -> Recipe Page
├── App.css                    # Unified styling, layout grid, and responsive breakpoints
└── main.tsx                   # React root entry point wrapped with AuthProvider
```

---

## 3. Real Problems I Ran Into & How I Solved Them

Building the frontend brought up several interesting challenges around media handling, form validation, and user experience. Here is how I addressed them:

### 1. The Broken Video Problem (Black Box at 0:00)
- **The Issue**: When users submitted Instagram Reel or YouTube links as recipe video tutorials, the app originally put them into a native HTML5 `<video src="...">` tag. Because Instagram and YouTube URLs are web pages (not direct `.mp4` file streams), the browser couldn't play them, showing an empty black box frozen at `0:00`.
- **How I fixed it**: I created a dedicated [src/components/VideoPlayer.tsx](file:///Users/naishajain/Documents/crave-recipe-app/src/components/VideoPlayer.tsx) component with regex pattern matching:
  - **YouTube & Shorts**: Extracts the video ID from `watch?v=`, `youtu.be/`, or `/shorts/` and generates a clean, responsive `iframe` embed.
  - **Instagram Reels & Posts**: Extracts the post ID from `instagram.com/p/ID` or `instagram.com/reel/ID` and renders an Instagram embed iframe, along with an "Open Original Post on Instagram ↗" external fallback button so users can easily view it on mobile apps.
  - **Direct Uploads & MP4s**: Any file ending in `.mp4`, `.mov`, `.webm`, or stored under `/uploads/` uses the native `<video controls playsInline>` player.
  - **Fallback**: Other external links render an elegant preview card with a direct button to watch the video on the external site.

### 2. Huge 8MB Phone Camera Photos Freezing Uploads
- **The Issue**: Taking a recipe photo on a modern phone produces a 5MB to 12MB image. Uploading these raw files over mobile connections caused slow uploads, server storage waste, and laggy rendering in the recipe feed.
- **How I fixed it**: In [src/utils/mediaUtils.ts](file:///Users/naishajain/Documents/crave-recipe-app/src/utils/mediaUtils.ts), I wrote an in-browser image compression function (`compressImage`) using the HTML5 Canvas API:
  - Reads the selected photo into an image element via `FileReader`.
  - Calculates aspect ratio and scales large photos down to a maximum of 1200px width/height.
  - Draws the resized frame to an off-screen canvas and exports it as a JPEG at 80% quality.
  - **Result**: An 8MB camera photo shrinks down to **~150KB–200KB** before ever leaving the user's device, uploading in less than a second while still looking sharp on retina displays.

### 3. Broken External Food Images
- **The Issue**: If a user submitted a recipe with a link to an image that later broke, 404'd, or was blocked by hotlinking, the recipe card rendered an ugly broken image placeholder.
- **How I fixed it**: Defined a reliable default food image (`DEFAULT_RECIPE_IMAGE`) and added an `onError` event handler to every recipe image across cards and modals. If any image fails to load, it automatically swaps to the clean default photo without breaking the card layout.

### 4. Ingredients Parsing Mismatch
- **The Issue**: In the recipe creation modal, users were instructed: *"separate each with a comma or new line"*. However, the code was only splitting on commas (`.split(",")`). If someone pasted a multi-line ingredient list from their notes app, the entire paragraph was saved as a single bullet point. Meanwhile, the edit modal only split on newlines.
- **How I fixed it**: Updated both `App.tsx` and `RecipeEditModal.tsx` to split on regex `split(/[\n,]+/)`. Now users can paste ingredient lists separated by commas, newlines, or both, and the app cleanly parses them into individual items.

### 5. Form Validation Blocking Uploaded Media
- **The Issue**: In `RecipeEditModal.tsx`, the photo URL input was set to `<input type="url" />`. When a user uploaded a photo from their gallery, the returned path was relative (e.g. `/uploads/crave-123.jpg`), which native browser validation flagged as "invalid URL", blocking form submission.
- **How I fixed it**: Switched the input to `type="text"`, allowing relative paths, localhost URLs, and external links without browser validation errors.

---

## 4. Key User Flows & Feature Tour

### 4.1. Login Dashboard First (Entry Gate)
Per my mentor's architectural guidance, unauthenticated visitors do not immediately drop into the recipe catalog. Instead, they land on the **Login Dashboard**:
- **Welcome & Features Overview**: Highlights the personal cookbook, smart video player, and client-side photo compression.
- **Authentication Card**: Clean tabs to toggle between "Sign In" and "Create Account". Clean, professional inputs without prefilled or exposed credentials.
- **Guest Explorer Option**: For visitors who prefer to preview recipes before creating an account, a clean "Browse recipes as guest" button allows instant browsing.

### 4.2. View State & Refresh Persistence
To guarantee a seamless experience across browser reloads:
- **No Reset to Dashboard on Refresh**: When viewing the "Explore Recipes" catalog or "Favorites" tab, refreshing the page (Cmd+R / F5) keeps the user on that exact view rather than bouncing them back to the dashboard.
- **Recipe Detail URL Hash Sync**: Opening a recipe detail modal synchronizes `#recipe-<id>` to the URL hash. If the user refreshes while viewing a recipe's ingredients or video tutorial, the modal is automatically restored on page reload.
- **Guest State Persistence**: Guest browsing state is safely preserved across reloads so guests can browse freely without being forced back to the sign-in screen.

### 4.2. User Kitchen Dashboard (Post-Login)
Once authenticated, the user lands on their personalized **Kitchen Dashboard**:
- **Personalized Header**: Greets the user by name with quick action buttons ("Explore All Recipes ↗", "+ Add Recipe", and "Admin Console" for administrators).
- **Live PostgreSQL Metrics**: Counter cards displaying total active recipes, personal favorited count, available cuisines, and kitchen status.
- **Quick Action Shortcuts**: Direct visual cards to browse the recipe catalog, publish a dish, or open saved favorites.
- **Fresh Recipes Showcase**: A preview grid of the latest recipes added to the database with direct "View Recipe" links.

### 4.3. Recipe Exploration & Search
Navigating to the **Explore Recipes** tab reveals the full culinary studio:
- **Category Filter Pills**: Clicking pills (`All`, `Italian`, `Healthy`, `Breakfast`, `Dessert`, `Main Course`, `Quick Meals`) dynamically filters cards in real-time.
- **Search Bar**: Live search filters both recipe names and categories simultaneously as you type.
- **Favorites System**: Clicking the favorite toggle on any card bookmarks the recipe and updates PostgreSQL in real time. The "Favorites" tab filters the view to show only bookmarked recipes.

### 4.4. Recipe Creation, Editing & Ownership Controls
- Accessible via "+ Add Recipe" in the header, or "Edit" on recipe cards and inside the detail modal.
- **Strict Author Ownership**: The `Edit` and `×` (Delete) buttons are conditionally rendered. A regular user only sees modification controls on recipes they personally created (`recipe.userId === user.id`). Recipes created by other chefs only allow viewing and favoriting. Administrators have universal oversight.
- **Dual Media Selection**:
  1. Click **Choose Photo from Gallery** to upload from device files (triggers automatic canvas compression to ~150KB with live status).
  2. Or paste a web URL or video link (YouTube, Instagram Reels, Vimeo, direct MP4) directly into the input field.
- Shows live thumbnail and video previews inside the form so users can confirm their media before saving.

### 4.5. Admin Portal (`/admin`)
An isolated management console accessible only to verified administrators:
- **Sole Admin Architecture**: The system enforces that only Naisha accounts can hold administrator privileges. Other accounts cannot be promoted to admin.
- **System Overview**: Live metric cards displaying total users, published recipes, trashed recipes, and login counts, along with a table of recent activity.
- **User Directory**: Searchable list of all registered accounts. Admins can manage account status (activate/disable to prevent login) or delete accounts. Self-action protections ensure admins cannot accidentally lock themselves out.
- **Activity & Session Logs**: Live audit history showing logins, logouts, failed login attempts, and recipe restorations with timestamps, IP addresses, and user-agent strings.
- **Recipe Management & Trash Recovery**: Filter between active and deleted recipes. Trashed recipes can either be restored back to the public site or permanently purged.

---

## 5. Build Quality & Performance

- **Zero TypeScript Errors**: Built strictly with typed interfaces for recipes, users, stats, and audit logs.
- **Clean Aesthetic**: Completely emoji-free, professional styling using typography, CSS badges, and custom SVG iconography.
- **Fast Build Times**: `npm run build` (`tsc -b && vite build`) compiles in **~150ms**.
- **Compact Bundle**: The production bundle is roughly **82 KB gzipped**, keeping load times instantaneous.
- **Responsive Layout**: Custom media queries ensure the layout adapts cleanly across desktop monitors, laptops, tablets (stacked sidebar layout at 900px), and mobile phones (compact cards and full-width modals).

---

## 6. How to Test & Demo to Your Mentor

Here is the exact step-by-step path to demonstrate the application:

1. **Open the Application**:
   - Go to `http://localhost:5173/`.
   - Notice that the **Login Dashboard** opens first, greeting the reviewer with the clean hero and features list.
2. **Sign In or Explore as Guest**:
   - Enter your account credentials or click **Browse recipes as guest** to explore immediately without an account.
   - When signed in, the app authenticates and transitions smoothly into your personalized **User Kitchen Dashboard**.
3. **Explore the User Dashboard**:
   - Point out the real-time metric counters (Active Recipes, Saved Favorites, Cuisines).
   - Click one of the recent recipes to open the detail modal and inspect the smart video player.
4. **Navigate to the Recipe Page & Test Refresh Persistence**:
   - Click **Explore All Recipes ↗** in the dashboard banner (or the **Explore Recipes** tab in the navbar).
   - Point out that recipes authored by other users show only "View Recipe" and the favorite toggle (no edit or delete buttons).
   - **Press Refresh (Cmd+R / F5)**: Notice that you remain on the recipe page! The view does not reset to the dashboard.
5. **Create & Edit a Recipe**:
   - Click **+ Add Recipe**. Pick a photo from your gallery (notice the compression status), paste a YouTube or Instagram Reel link, and save.
   - Watch the new recipe appear in the feed. Notice that because you created this recipe, the **Edit** and **×** (Delete) buttons appear! Click **Edit** on the card to change the cook time or title, save, and confirm that PostgreSQL updates instantly.
6. **Open the Admin Console (Naisha Sole Admin)**:
   - Sign in with Naisha's administrator account (`naisha@test.com` / `password123`).
   - Click the **Admin** button in the navbar (or visit `http://localhost:5173/admin`).
   - Review live metrics, inspect user accounts, test soft-deleting and restoring a recipe from the Trash tab.
   - Note that no other user can be promoted to administrator.
   - Click **Sign Out** and observe that the app returns to the Login Dashboard, having logged the logout event to PostgreSQL.
