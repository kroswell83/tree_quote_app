Tree Quote Shared Customer App

Files:
- index.html: app
- firebase-config.js: paste your Firebase config here
- firestore.rules: paste these into Firestore Rules for the MVP

Firebase setup:
1. Create Firebase project.
2. Add a Web App and copy the Firebase config into firebase-config.js.
3. Enable Authentication > Email/Password.
4. Create Cloud Firestore.
5. Paste firestore.rules into Firestore Rules and publish.
6. Host these files on Firebase Hosting, Vercel, Netlify, or your own web host.

Shared company data:
- In the app Sync tab, set a Company ID like "my-tree-company".
- Anyone signed in using the same app and same Company ID will load the same customers, quotes, settings, and tree list.

Customer-facing quote:
- The Customer Quote output intentionally does not show hourly rates, man-hours, or internal pricing math.
- It lists customer/job info, selected services, and the total quote price.
