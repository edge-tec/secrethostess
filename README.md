# SecretHostess Auto Poster Pro (ক্রোম এক্সটেনশন)

একটি শক্তিশালী ও আধুনিক Google Chrome Extension (Manifest V3) যা [SecretHostess Admin Panel](https://secrethostess.com/admin/login.php) এ একাধিক একাউন্ট থেকে স্বয়ংক্রিয়ভাবে পার্ট-বাই-পার্ট ফর্ম ফিলআপ করে লিস্টিং পোস্ট করতে সক্ষম।

---

## 🌟 প্রধান বৈশিষ্ঠ্যসমূহ (Key Features)

1. **মাল্টি-একাউন্ট কিউ (Multi-Account Queue):**
   - ইউজার যত ইচ্ছা একাউন্ট `username:password` ফরম্যাটে বাল্ক ইনপুট দিয়ে রাখতে পারবেন।
   - প্রতি একাউন্টের স্ট্যাটাস (Pending, Posting, Completed, Failed), পোস্ট করা সিটির নাম ও সময় ট্র্যাক করা হয়।
2. **স্মার্ট ইউএসএ সিটি রোটেশন (Sequential USA City Rotation):**
   - Country হিসেবে **USA** সিলেক্ট হলে এর সিটির ড্রপডাউনে যতগুলো সিটি থাকে (যেমন: Abbeville AL, etc.), প্রতিটি একাউন্ট পরবর্তী সিটিতে পোস্ট করবে।
   - **১ম একাউন্ট ১ম সিটিতে** পোস্ট করবে ➔ লগআউট হবে ➔ **২য় একাউন্ট লগইন করে ২য় সিটিতে** পোস্ট করবে ➔ এভাবে ধারাবাহিকভাবে সব সিটিতে পোস্ট সম্পন্ন হবে।
   - চাইলে নিজস্ব পছন্দের "Custom City Target List" ও ব্যবহার করা যায়।
3. **সম্পূর্ণ ফর্ম অটোমেশন (Full Form Auto-Fill according to Screenshots):**
   - **Part 1 (Listing Details):** Title, Description (HTML / Rich Text Editor), Short Description, Age, Category.
   - **Part 2 (Contact Details):** Country (USA), City Rotation, Suburb, Mobile.
   - **Part 3 (Extra Contact Details):** Location, Email, Website, Facebook.
   - **Part 4 (Appearance):** Height(cm), Weight(KG), Bust Size, Body Type, Ethnicity, Hair Colour, Eye Color, Skin Colour, Dress Size, Breast Type.
   - **Part 5 (In-Call / Out-Call):** ইন-কল ও আউট-কল চেকবক্স।
   - **Part 6 (Clients):** Couples, Disabled, Groups/Parties, Ladies, Men, Transsexuals.
   - **Part 7 (Services):** BDSM, Body Rub, Full Service, Strip/Dance.
   - **Part 8 (Working Hours):** Mon থেকে Sun প্রতিদিনের Start টাইম, Finish টাইম এবং 24Hr চেকবক্স।
4. **ক্লাউডফ্লেয়ার টার্নস্টাইল হ্যান্ডলিং (Cloudflare Turnstile Support):**
   - পেজে Cloudflare Captcha / Turnstile ডিটেক্ট করে ভেরিফিকেশনের জন্য অপেক্ষা করে।
5. **ফ্লোটিং লাইভ HUD (On-Page Live Floating HUD):**
   - SecretHostess পেজের উপরে ডানে লাইভ প্রগ্রেস, বর্তমান একাউন্ট, টার্গেট সিটি, Pause এবং Stop বাটন প্রদর্শন করে।
6. **পূর্ণাঙ্গ ড্যাশবোর্ড ও লাইভ লগ (Modern Glassmorphic Control Panel):**
   - অপশন পেজ হিসেবে চমৎকার ডার্ক থিমের ড্যাশবোর্ড যেখানে কিউ ম্যানেজমেন্ট, পোস্ট টেমপ্লেট ও লাইভ কার্যকলাপ দেখা যায়।

---

## 🚀 ইনস্টলেশন গাইড (Chrome এ যেভাবে ইনস্টল করবেন)

1. আপনার গুগল ক্রোম ব্রাউজার খুলুন।
2. ব্রাউজারের অ্যাড্রেস বারে যান এবং টাইপ করুন:
   ```text
   chrome://extensions
   ```
3. পেজের উপরের ডান কোণে **"Developer mode"** টগলটি অন করুন।
4. উপরের বাম কোণে **"Load unpacked"** বাটনে ক্লিক করুন।
5. ফাইল সিলেক্টর থেকে এই ফোল্ডারটি সিলেক্ট করুন:
   ```text
   /Volumes/EDGE/posting boh
   ```
6. সাথে সাথে আপনার এক্সটেনশন তালিকায় **"SecretHostess Auto Poster Pro"** দেখতে পাবেন!

---

## 🛠 যেভাবে ব্যবহার করবেন (Step-by-Step Usage Guide)

### ধাপ ১: এক্সটেনশন ড্যাশবোর্ড খুলুন
- ব্রাউজারের এক্সটেনশন আইকনে ক্লিক করে **"⚙️ Open Full Dashboard & Settings"** বাটনে ক্লিক করুন।

### ধাপ ২: একাউন্ট লিস্ট যোগ করুন (Accounts Queue)
- **Accounts Queue** ট্যাবে যান।
- ইনপুট বক্সে আপনার একাউন্টগুলো নিচের নিয়মে এক লাইনে একটি করে পেস্ট করুন:
  ```text
  user1:pass123
  user2:pass456
  user3:pass789
  ```
- **"➕ Add to Queue"** বাটনে ক্লিক করুন। টেবিলটিতে একাউন্টগুলো জমা হবে।

### ধাপ ৩: লিস্টিং কন্টেন্ট সেট করুন (Listing Content)
- **Listing Content** ট্যাবে গিয়ে আপনার টাইটেল, ডেসক্রিপশন, বয়স, ক্যাটাগরি, শারীরিক বিবরণ, সার্ভিস ও কাজের সময়সূচী সেট করে নিন।
- **USA City Rotation Mode:**
  - ডিফল্টভাবে **"Sequential Dropdown Rotation"** অন থাকবে। এর ফলে ১ম একাউন্ট ১ম সিটিতে, ২য় একাউন্ট ২য় সিটিতে পোস্ট করবে।
- উপরের **"💾 Save All Changes"** বাটনে ক্লিক করুন।

### ধাপ ৪: অটোমেশন শুরু করুন (Start Posting)
- সাইডবার থেকে অথবা পপআপ থেকে **"▶ Start Queue"** বাটনে ক্লিক করুন।
- এক্সটেনশন স্বয়ংক্রিয়ভাবে:
  1. `secrethostess.com/admin/login.php` এ গিয়ে ১ম একাউন্ট দিয়ে লগইন করবে।
  2. ড্যাশবোর্ডে গিয়ে **Add Listing** এ ক্লিক করবে।
  3. সম্পূর্ণ ফর্ম ফিল করবে এবং প্রথম সিটি সিলেক্ট করবে।
  4. **NEXT Add Images** বাটনে ক্লিক করবে এবং পোস্ট কমপ্লিট করবে।
  5. পোস্ট সফল হলে অটোম্যাটিক ১ ক্রেডিট কর্তন হবে।
  6. লগআউট হয়ে ২য় একাউন্টে লগইন করবে এবং পরবর্তী সিটিতে পোস্ট করবে।
  7. সবগুলো একাউন্ট শেষ না হওয়া পর্যন্ত এটি ক্রমান্বয়ে চলবে।

---

## 🔑 পেইড লাইসেন্স ও এপিআই সিস্টেম (Paid License & API System)

এই এক্সটেনশনটিকে একটি বাণিজ্যিক / পেইড এক্সটেনশনে রূপান্তর করা হয়েছে যেখানে প্রতি পোস্টে **১ ক্রেডিট** খরচ হয় এবং প্রতিটি লাইসেন্স কি-র নির্দিষ্ট মেয়াদ থাকে (ডিফল্ট: **১ মাস**)।

### ১. লাইসেন্স এপিআই সার্ভার রান করার নিয়ম
সার্ভারটি পিওর Node.js দিয়ে তৈরি, কোনো বাহ্যিক প্যাকেজ ইন্সটল করার প্রয়োজন নেই:
```bash
cd "server"
node server.js
```
- সার্ভারটি `http://localhost:3000` এ চালু হবে।
- এডমিন পোর্টাল: **[http://localhost:3000/admin](http://localhost:3000/admin)**
- ডিফল্ট এডমিন পাসওয়ার্ড: `admin123`

### ২. এডমিন যেভাবে লাইসেন্স ও ক্রেডিট নিয়ন্ত্রণ করবেন
- **নতুন কি জেনারেট (Generate Key):** ক্লায়েন্টের নাম, মেয়াদ (১ মাস, ২ মাস, ৩ মাস, ১ বছর) এবং ক্রেডিট (যেমন: ৫০, ১০০, ৫০০ বা আনলিমিটেড) সিলেক্ট করে এক ক্লিকে কি তৈরি করতে পারবেন।
- **ক্রেডিট রিচার্জ (Recharge Credits):** ইউজারের ক্রেডিট শেষ হলে এডমিন পোর্টালের টেবিল থেকে **+ Credits** বাটনে চাপ দিয়ে যেকোনো পরিমাণ ক্রেডিট বাড়িয়ে দিতে পারবেন।
- **মেয়াদ বাড়ানো (Extend Expiration):** মেয়াদ শেষ হলে **+30 Days** বাটনে ক্লিক করলেই ইউজারের লাইসেন্স মেয়াদ আরও ১ মাস বেড়ে যাবে।

### ৩. ইউজার যেভাবে এক্সটেনশনে লাইসেন্স সক্রিয় করবেন
1. এক্সটেনশন ড্যাশবোর্ডে **License & Credits** ট্যাবে যান।
2. এডমিন থেকে পাওয়া লাইসেন্স কি-টি পেস্ট করুন (যেমন: `SHP-DEMO-8899-AABB-1122`)।
3. **"🚀 Verify & Activate License Key"** বাটনে ক্লিক করুন।
4. সাথে সাথে লাইসেন্স সক্রিয় হবে এবং বাকি দিন ও ক্রেডিট দেখা যাবে।

---

## 📂 ফাইল স্ট্রাকচার (File Structure)

```text
posting boh/
├── manifest.json              # Chrome Manifest V3 কনফিগারেশন
├── icons/                     # 16px, 48px, 128px রিয়েল আইকন
├── background/
│   └── background.js          # ব্যাকগ্রাউন্ড সার্ভিস ওয়ার্কার (Queue, City rotation & License enforcement)
├── content/
│   ├── content.js             # কনটেন্ট স্ক্রিপ্ট (Form filler, Turnstile, Auto-Logout)
│   └── content.css            # অন-পেজ ফ্লোটিং HUD স্টাইল
├── popup/
│   ├── popup.html             # কুইক কন্ট্রোল পপআপ (লাইসেন্স ও ক্রেডিট স্ট্যাটাস সহ)
│   ├── popup.css
│   └── popup.js
├── dashboard/
│   ├── dashboard.html         # ফুল-স্ক্রিন ড্যাশবোর্ড (লাইসেন্স অ্যাক্টিভেশন ও টেমপ্লেট ম্যানেজার)
│   ├── dashboard.css
│   └── dashboard.js
├── server/                    # 🔑 লাইসেন্স ও ক্রেডিট এপিআই সার্ভার
│   ├── server.js              # পিওর Node.js REST API + Web Admin Dashboard
│   ├── licenses.json          # পারসিস্টেন্ট লাইসেন্স ডাটাবেস
│   └── package.json
└── README.md                  # বিস্তারিত নির্দেশনা
```
