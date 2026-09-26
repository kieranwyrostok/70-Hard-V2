# Seventy Hard

A 70-day habit challenge app for your phone. It works offline once installed, and a small Netlify backend adds the online parts listed below.

**First launch runs a six-step setup:** profile, goal and targets, rules, training split, and sleep window, then a review screen and lock-in. Targets are estimated from your profile (Mifflin–St Jeor), your starting weight becomes the Day 1 baseline, the split renames each Train day, and Day 1 can start today, tomorrow or next Monday. After lock-in, the rules are fixed until Day 70. **Restart challenge** (on the setup screen, or under Habits & reminders) wipes the log and runs setup again. There are no accounts: everything is saved on the phone.

The Netlify backend adds:

- **Food search**: type a food and results come from the USDA FoodData Central database (generic and branded foods, exact per-gram values).
- **Barcode scanning**: tap **SCAN** on the Fuel screen. Barcodes are looked up in Open Food Facts first, then USDA's branded foods.
- **Your own foods**: tap **+ Create your own food**. Anything you create is saved and shows up in search. If you create it after a barcode that wasn't found, it scans next time.
- **Push notifications**: each reminder on the Habits & reminders screen arrives at its set time, even with the app closed. Rules you've already cleared that day are skipped.

## What's in this folder

```
public/              the app itself (what your phone loads)
netlify/functions/   the server parts: food search, barcode lookup, push reminders
netlify/lib/         code shared by those functions
netlify.toml         tells Netlify how to build the site
package.json         the three libraries Netlify installs (web-push, @netlify/blobs, @zxing/library)
```

## Put it online (about 10 minutes, free)

The server parts need Netlify to build the site from GitHub. Dragging the folder onto Netlify Drop only publishes the app, without food search or notifications.

### 1. Put the files on GitHub
1. Sign in at https://github.com (make a free account if you need one).
2. Click **+** at the top right, then **New repository**. Name it `seventy-hard`. Private is fine. Click **Create repository**.
3. On the new repo page, click **uploading an existing file**.
4. Unzip `seventy-hard.zip` on your computer. Open the `seventy-hard` folder and drag **everything inside it** (`public`, `netlify`, `netlify.toml`, `package.json`, `README.md`) into the browser window.
5. Click **Commit changes**.

### 2. Connect it to Netlify
1. Sign in at https://app.netlify.com. Signing in with GitHub is easiest.
2. Click **Add new project**, then **Import an existing project**, then **GitHub**, and pick `seventy-hard`.
3. Leave the build settings as they are, because `netlify.toml` fills them in. Click **Deploy**.
4. After a minute or two you get a link like `https://something.netlify.app`. You can rename it under **Project configuration**, then **Change project name**.

### 3. Add your free USDA key (recommended)
The app works without a key, but it then shares USDA's public demo key, which allows only about 50 searches a day.
1. Get a key at https://api.data.gov/signup. It's emailed to you instantly.
2. In Netlify, go to **Project configuration**, then **Environment variables**, then **Add a variable**. Set the key to `USDA_API_KEY` and paste your key as the value.
3. Go to **Deploys**, then **Trigger deploy**, then **Deploy site**, so the new key takes effect.

## Install on your phone

- **iPhone (iOS 16.4 or later):** open the link in **Safari**, tap Share, then **Add to Home Screen**. Always open the app from that icon. Notifications only work there.
- **Android:** open the link in **Chrome**, tap ⋮, then **Install app**.

Run the setup, then open **Today**, tap **Habits & reminders**, then **Turn on notifications**, and allow them. Tap **Send test** to check a notification arrives.

## Moving from the earlier version

If you already installed the first version from a different link, its data stays with that link. In the old app, tap **Export backup** on Habits & reminders. In the new app, tap **Restore from backup** and pick that file.

## How the notifications work

- Your phone registers with Apple's or Google's push service. The Netlify function `push-subscribe` stores that registration and your reminder schedule in Netlify Blobs, Netlify's built-in storage.
- `push-cron` runs every 5 minutes and sends any reminder that has come due. It uses your phone's time zone, so reminders can arrive up to about 5 minutes after the set time.
- The app sends your schedule and today's cleared rules whenever they change, so reminders you edit take effect right away.
- The encryption keys for sending notifications (VAPID keys) are created automatically the first time. You don't need to set anything up.
- To check it's running, go to **Logs**, then **Functions**, then `push-cron` in Netlify. Each run logs how many notifications it sent.

## Updating the app later

Edit or replace files in the GitHub repo. Netlify rebuilds automatically, and the phone picks up the new version the next time the app is opened online. Close it and reopen it if you don't see the change. Your data stays on the phone.

## Good to know

- **Your logs stay on the phone.** Only your reminder schedule, time zone, and which rules you've cleared today are sent to your Netlify site. Back up now and then with **Export backup**.
- **Scanning on iPhone** uses a barcode library that downloads the first time you scan, so do your first scan with internet.
- **Food values**: database foods store exact per-100 g values. Tap a logged meal to change the grams and everything rescales.
- **Cost**: it all fits in Netlify's free plan at personal use, and USDA and Open Food Facts are free.
