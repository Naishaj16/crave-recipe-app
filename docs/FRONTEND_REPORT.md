# Crave – Frontend Report

Naisha Jain
November 2026

Stack: React 19, TypeScript, Vite, plain CSS, Canvas API (for image compression)
Runs locally at `http://localhost:5173/`, admin panel at `/admin`

---

## How I wanted it to look

It's a recipe app, so I wanted it to feel warm and simple rather than like a dashboard. I kept the colors close to food and kitchen tones: an off-white background (`#fafaf8`), light beige cards (`#f4f3ed`) and an olive green (`#4a6341`) for buttons. Recipe names and headings use a serif font, while ingredients and steps use a sans-serif so they're easy to read while cooking.

I also kept the admin stuff completely off the main site. The homepage is only for browsing and saving recipes. Everything admin-related is under `/admin` and needs an admin login.

## Structure

```text
src/
├── components/
│   ├── AdminPortal.tsx      # admin panel (overview, users, activity, recipes)
│   ├── RecipeEditModal.tsx  # edit form with photo/video preview
│   ├── VideoPlayer.tsx      # picks the right player for YouTube, Instagram, or a file
│   └── AuthModal.tsx        # login and signup
├── context/AuthContext.tsx  # logged-in user, token, logout
├── services/                # API calls: recipeService, authService, adminService
├── utils/mediaUtils.ts      # image compression and upload helper
├── App.tsx                  # homepage: search, category filters, recipe grid
├── App.css
└── main.tsx
```

API calls live in `services/` so components don't call `fetch` directly. Auth state lives in a context because the header, the recipe cards and the admin panel all need to know who's logged in.

## Problems I had to fix

**Videos showed up as a black box.** At first I put every video link in a `<video>` tag. That works for an actual `.mp4` file, but YouTube and Instagram links are web pages, not video files, so the player just sat at 0:00. I made a `VideoPlayer` component that checks the URL first:

- YouTube (`watch?v=`, `youtu.be/`, `/shorts/`): pulls out the video ID and uses the YouTube embed iframe
- Instagram (`/p/` or `/reel/`): uses Instagram's embed, plus an "Open on Instagram" link because the embed doesn't always load on phones
- uploaded files or links ending in `.mp4`, `.mov` or `.webm`: normal `<video controls playsInline>`
- anything else: a card with a button to open the link

**Phone photos were too big.** Photos from a phone camera are usually 5–12 MB, so uploads were slow and the feed got laggy. In `mediaUtils.ts` I wrote a `compressImage` function that runs before uploading. It loads the image, scales it down so the longest side is at most 1200 px, draws it on a canvas and exports a JPEG at 80% quality. In my testing an 8 MB photo came out at around 150–200 KB and still looked fine.

**Broken image links.** If someone used an image URL that later stopped working, the card showed the broken-image icon. I added a default food image and an `onError` handler on every recipe image that switches to it.

**Ingredients weren't split correctly.** The add form said "separate with a comma or new line" but the code only split on commas, so a pasted list ended up as one long ingredient. The edit form had the opposite problem and only split on new lines. Both now use `split(/[\n,]+/)`. One catch is that an ingredient with a comma in it, like "1 cup flour, sifted", gets split into two. I haven't fixed that yet.

**The form wouldn't submit after uploading a photo.** The photo field was `<input type="url">`. After an upload, the value was a relative path like `/uploads/crave-123.jpg`, which the browser doesn't accept as a URL, so it blocked the form. I changed it to `type="text"`.

## Main features

**Browsing.** You can filter by category (All, Italian, Healthy, Breakfast, Dessert, Main Course, Quick Meals) and search by name or category. The heart icon saves a recipe as a favorite, and the Favorites button shows only those.

**Logged out users.** Clicking Add Recipe, Edit or the heart when you're not logged in opens the login modal instead.

**Adding and editing recipes.** You can either pick a photo from your device (it gets compressed and shows "Compressing…" while it works) or paste an image URL. You can also paste a YouTube or Instagram link for the video. The form shows a preview of both before you save.

**Admin panel (`/admin`):**
- Overview with counts of users, recipes, trashed recipes and logins, plus recent activity
- Users list where you can change roles, disable accounts or delete them (you can't do these to yourself)
- Activity log with logins, logouts, failed logins and admin actions, with time, IP and browser
- Recipes list with active/trash tabs, where you can move to trash, restore or delete permanently

## Build

The project builds with `npm run build` (`tsc -b && vite build`) with no TypeScript errors. Recipes, users, stats and log entries all have their own types. The production JS bundle is about 79 KB gzipped.

The layout has breakpoints for tablet (the admin sidebar stacks on top below 900 px) and phone (smaller cards and full-width modals).

## Things I'd improve

- Favorites currently aren't per user (this comes from the backend, which I explain in the backend report).
- The token is kept in localStorage, which is simple but readable by any script on the page. An httpOnly cookie would be safer.
- There are no frontend tests yet. I tested the flows by hand and through the backend test script.
- The ingredient comma problem mentioned above.

## Demo steps

1. Open `http://localhost:5173/`, try the category filters, search for "garlic" or "chicken", and open a recipe.
2. Without logging in, click "+ Add Recipe". The login modal should open.
3. Log in with the test user account from the seed data, or sign up.
4. Add a recipe with a photo from your computer and a YouTube or Instagram link. It should appear at the top of the list.
5. Edit it (change the time or the title) and check that the card updates.
6. Go to `/admin` and log in with the seeded admin account.
   - Check that the overview numbers look right.
   - In Recipes, move one to trash, then check that it's gone from the homepage.
   - Restore it from the Trash tab and check that it's back.
   - Sign out, log back in, and the logout should be in the Activity tab.
