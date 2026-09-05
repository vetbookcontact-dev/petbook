# פריסת וט-בוק — Firebase + Netlify

נשארים ב-Spark החינמי: Authentication + Firestore בלבד. תמונות נשמרות כ-Base64 דחוס בתוך מסמכי Firestore (בלי Cloud Storage / Blaze).

## 1. קונסולת Firebase

1. צרו פרויקט ב-[Firebase Console](https://console.firebase.google.com).
2. Authentication → Sign-in method → הפעילו **Google**.
3. Firestore Database → Create database (production) → הדביקו את הכללים מ-[firestore.rules](firestore.rules).
4. Project settings → Your apps → Web app → העתיקו את מפתחות הקונפיג.
5. Authentication → Settings → Authorized domains: השאירו `localhost`, ואחרי הפריסה הוסיפו את דומיין Netlify (למשל `your-site.netlify.app`).

מבנה הנתונים: `users/{uid}` (פרופיל) → תת-אוסף `pets` → תת-אוסף `vaccines`. אחרי המיגרציה האוטומטית אפשר למחוק בקונסולה את האוספים הישנים ברמה העליונה `pets` / `vaccines`.

אין צורך להפעיל Storage.

## 2. משתני סביבה מקומיים

```bash
cp .env.example .env
```

מלאו ב-`.env`:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

המפתחות האלה ציבוריים בצד הלקוח. האבטחה היא ב-Rules, לא בהסתרת המפתח.

```bash
npm run dev
```

## 3. Netlify

1. חברו את הריפו ל-Netlify (או העלו את `dist` אחרי `npm run build`).
2. Build command: `npm run build` · Publish directory: `dist` (מוגדר ב-[netlify.toml](netlify.toml)).
3. Site settings → Environment variables — הוסיפו את אותם `VITE_*`.
4. Deploy. אחרי שיש URL, הוסיפו אותו ל-Authorized domains ב-Firebase Auth.
5. Redeploy אם שיניתם env אחרי ה-build הראשון.

## בדיקה אחרי העלאה

- התחברות Google
- מילוי פרופיל בעלים
- יצירת חיה + רענון הדף (הנתונים חייבים להישאר)
- עדכון חיסון
- התנתקות והתחברות מחדש
