// -----------------------------------------------------------------------------
// DEMO DATA  (not real legal advice)
// Used only until the back end is connected. The Results page shows a
// "Demo data" label whenever result.isDemo is true.
//
// Each demo has one version per language: { en: ..., ur: ... }.
//
// Optional fields the Results page can show if the back end sends them:
//   relevantInfo:    [ { title, text } ]                       "Relevant legal information"
//   sources:         [ { title, type, note, url?, status? } ]  status: "verified" | "unverified" | "demo"
//   lawyerType:      { type, reason, prepare: [] }              orientation only, never a final instruction
//   caseAssessment:  { summary, strengths: [], weaknesses: [], missingInfo: [],
//                       evidenceStrength: "low"|"moderate"|"strong"|"unknown",
//                       preparedness: "needsMore"|"reasonable"|"professionalReview",
//                       improve: [] }
//                    Never render this as a win/lose prediction or a percentage —
//                    it is a plain-language summary of the facts given, not a verdict.
// Demo sources are always marked "demo" so they are never shown as verified law.
// When your teammate's API is connected, the API sends the language code and
// returns content already in that language, so this file is not needed.
// -----------------------------------------------------------------------------

// The code sends these English names to the back end.
// The screen shows them translated (see "province.*" in the i18n files).
export const provinces = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Gilgit-Baltistan",
  "Azad Jammu & Kashmir",
];

// ----- Follow-up questions. type: "choice" | "yesno" | "text" -----
export const demoQuestions = {
  en: [
    {
      id: "q1",
      text: "Which best describes your situation?",
      type: "choice",
      options: [
        "Someone has taken or built on my land",
        "A family or inheritance dispute",
        "I bought land and there is a problem",
        "Something else",
      ],
    },
    {
      id: "q2",
      text: "Do you have official papers for the land?",
      type: "yesno",
      hint: "For example a registry, fard (record of rights), or a signed sale agreement.",
    },
    {
      id: "q3",
      text: "Has anyone threatened you or used force?",
      type: "yesno",
      hint: "Your safety comes first. An honest answer helps us guide you better.",
    },
    {
      id: "q4",
      text: "Is there anything else we should know?",
      type: "text",
      hint: "For example: plot size, location, or when it started. You can skip this.",
    },
  ],
  ur: [
    {
      id: "q1",
      text: "آپ کی صورتحال کو کون سا بیان بہتر طور پر ظاہر کرتا ہے؟",
      type: "choice",
      options: [
        "کسی نے میری زمین پر قبضہ کر لیا ہے یا تعمیر کر لی ہے",
        "خاندانی یا وراثت کا تنازع",
        "میں نے زمین خریدی ہے اور اس میں مسئلہ ہے",
        "کچھ اور",
      ],
    },
    {
      id: "q2",
      text: "کیا آپ کے پاس زمین کے سرکاری کاغذات ہیں؟",
      type: "yesno",
      hint: "مثلاً رجسٹری، فرد (ریکارڈ آف رائٹس) یا دستخط شدہ بیع نامہ۔",
    },
    {
      id: "q3",
      text: "کیا کسی نے آپ کو دھمکی دی ہے یا طاقت کا استعمال کیا ہے؟",
      type: "yesno",
      hint: "آپ کی حفاظت سب سے پہلے ہے۔ سچ بتانے سے ہمیں آپ کی بہتر رہنمائی کرنے میں مدد ملتی ہے۔",
    },
    {
      id: "q4",
      text: "کیا کوئی اور بات ہے جو ہمیں معلوم ہونی چاہیے؟",
      type: "text",
      hint: "مثلاً: پلاٹ کا سائز، جگہ، یا یہ مسئلہ کب شروع ہوا۔ آپ چاہیں تو یہ سوال چھوڑ سکتے ہیں۔",
    },
  ],
};

// ----- The result shape shown on the Results page -----
export const demoResult = {
  en: {
    isDemo: true,

    legalArea: {
      name: "Property and land law",
      tag: "Boundary and encroachment",
    },

    explanation: [
      "From what you shared, this looks like a land boundary dispute, where a neighbour may have built on or taken part of your land. The first step is to confirm exactly where your boundary is, using your official land records and a measurement by the revenue office.",
      "You should not remove the wall or use force yourself, because that can create legal trouble for you. If the boundary check shows your land was taken, you can ask the court to order it returned and to stop any further construction.",
    ],

    relevantInfo: [
      {
        title: "Land records",
        text: "Ownership and boundaries are recorded by the revenue department. Your fard (record of rights) and site map are the main proof of where your plot begins and ends.",
      },
      {
        title: "Boundary measurement",
        text: "The revenue office can measure and mark a plot on your application. Its written result is useful evidence in any later court case.",
      },
      {
        title: "Civil Court remedies",
        text: "If a neighbour has built on your land, you can ask the Civil Court to order it back and to stop further construction.",
      },
    ],

    authority: {
      name: "Revenue Office (Patwari and Tehsildar), then the Civil Court (demo example)",
      description:
        "The revenue office keeps the official land records and can measure and mark your boundary. If the matter is not settled, the Civil Court can decide it. Names and procedures can differ by province and district.",
      howToReach: [
        "Start at your local Patwari or the Tehsil office and ask for a boundary check (demarcation) of your plot.",
        "Bring your CNIC and copies of your land papers.",
        "For court, a local lawyer or the District Bar legal aid desk can help you file.",
      ],
    },

    timeline: [
      {
        title: "Collect your land papers",
        time: "1 to 3 days",
        detail: "Gather your registry, fard, site map, and any earlier receipts or applications.",
      },
      {
        title: "Ask for a boundary check",
        time: "1 to 4 weeks",
        detail: "Apply to the revenue office to measure and mark your plot. Ask for a written copy of the result.",
      },
      {
        title: "Try to settle calmly",
        time: "1 to 2 weeks",
        detail: "Share the result with your neighbour. If possible, involve respected elders or a local mediator.",
      },
      {
        title: "Send a legal notice or file a case",
        time: "1 to 2 weeks",
        detail:
          "If he still refuses, a lawyer can send a notice or file a suit in the Civil Court and ask for an order to stop further building.",
      },
      {
        title: "Attend the hearings",
        time: "Several months or longer",
        detail: "Go on every date with your original papers. The court may appoint a surveyor to measure the land.",
      },
      {
        title: "Receive the decision",
        time: "Depends on the case",
        detail: "The court will explain its order. Ask your lawyer about your options if you disagree.",
      },
    ],

    documents: [
      "CNIC copy (your own)",
      "Registry or sale deed for the plot",
      "Fard or record of rights (jamabandi)",
      "Site map (naqsha) of the plot",
      "Mutation (intiqal) copy, if you have it",
      "Property tax or utility bills for the plot",
      "Neighbour's name, address and phone number",
    ],

    evidence: [
      "Dated photos and videos of the wall and the plot",
      "Your plot measurements compared with the papers",
      "Names and phone numbers of neighbours or elders who know the boundary",
      "Screenshots of messages or threats",
      "Copies of any earlier application or complaint you made",
      "Notes of dates, times and what was said",
    ],

    actionPlan: [
      {
        when: "Today",
        title: "Stay safe and do not remove the wall yourself",
        detail:
          "Avoid arguments and physical confrontation. If you are threatened, report it at the nearest police station, and call 15 in an emergency.",
      },
      {
        when: "This week",
        title: "Gather your papers and evidence",
        detail: "Use the checklists below. Keep the originals safe and make photocopies.",
      },
      {
        when: "This week",
        title: "Ask the revenue office for a boundary check",
        detail: "Visit the Patwari or Tehsil office with your papers and ask for the result in writing.",
      },
      {
        when: "Next",
        title: "Speak to a lawyer or legal aid office",
        detail: "Show them your papers and the boundary result, and ask whether to send a notice or file a case.",
      },
    ],


    lawyerType: {
      type: "Property / Land Lawyer",
      reason:
        "This type of lawyer generally handles disputes over land ownership and boundaries, including encroachment, illegal construction, and applications to the Civil Court for possession or an order to stop construction.",
      prepare: [
        "Your registry, fard, and site map",
        "Any boundary-check result you already have",
        "A short written timeline of what happened",
      ],
    },

    caseAssessment: {
      summary:
        "Based only on what you have told us so far, here is a plain-language look at where things stand. This is not a prediction of what a court will decide.",
      strengths: [
        "You say you have registry papers for the plot",
        "You have not used force, which protects your legal position",
        "You have not received any conflicting legal notice",
      ],
      weaknesses: [
        "The boundary has not yet been officially measured",
        "No written notice has been exchanged with your neighbour yet",
      ],
      missingInfo: [
        "An official boundary check (demarcation) result",
        "Dated photos of the wall and the plot",
        "Your neighbour's exact claim, if any",
      ],
      evidenceStrength: "moderate",
      preparedness: "needsMore",
      improve: [
        "Apply to the revenue office for an official boundary check",
        "Take dated photos and videos of the wall and the surrounding area",
        "Keep a written record of every conversation with your neighbour",
        "Speak to a lawyer before sending any notice or filing a case",
      ],
    },

    legalAid: {
      show: true,
      title: "Need help paying for a lawyer?",
      text: "If you cannot afford a lawyer, you may be able to get free legal help. Ask at your District Bar Association or District Courts for a legal aid committee.",
      options: [
        "District Bar Association legal aid desk",
        "Provincial Bar Council legal aid committee",
        "Local legal aid NGOs in your city",
      ],
    },

    sources: [
      {
        title: "Provincial Land Revenue laws",
        type: "Law",
        status: "demo",
        note: "Land records and boundary measurement.",
      },
      {
        title: "Code of Civil Procedure, 1908",
        type: "Law",
        status: "demo",
        note: "General court procedure.",
      },
      {
        title: "Specific Relief Act, 1877",
        type: "Law",
        status: "demo",
        note: "Orders to stop or undo an action.",
      },
    ],
  },

  ur: {
    isDemo: true,

    legalArea: {
      name: "جائیداد اور زمین کا قانون",
      tag: "حد بندی اور تجاوزات",
    },

    explanation: [
      "آپ کی بتائی گئی بات سے یہ زمین کی حد بندی کا تنازع لگتا ہے، جس میں ممکن ہے آپ کے پڑوسی نے آپ کی زمین کے کچھ حصے پر تعمیر کر لی ہو یا اسے اپنے قبضے میں لے لیا ہو۔ پہلا قدم یہ ہے کہ زمین کے سرکاری ریکارڈ اور محکمۂ مال کی پیمائش کے ذریعے آپ کی حد کا ٹھیک ٹھیک تعین کیا جائے۔",
      "آپ کو خود دیوار نہیں گرانی چاہیے اور نہ ہی زور زبردستی کرنی چاہیے، کیونکہ اس سے آپ کے لیے قانونی مشکل پیدا ہو سکتی ہے۔ اگر حد بندی سے ثابت ہو جائے کہ آپ کی زمین پر قبضہ ہوا ہے تو آپ عدالت سے درخواست کر سکتے ہیں کہ زمین واپس دلائی جائے اور مزید تعمیر روکی جائے۔",
    ],

    relevantInfo: [
      {
        title: "زمین کا ریکارڈ",
        text: "ملکیت اور حدود کا اندراج محکمۂ مال کے پاس ہوتا ہے۔ آپ کی فرد (ریکارڈ آف رائٹس) اور پلاٹ کا نقشہ اس بات کا بنیادی ثبوت ہیں کہ آپ کا پلاٹ کہاں سے شروع اور کہاں ختم ہوتا ہے۔",
      },
      {
        title: "حد بندی کی پیمائش",
        text: "محکمۂ مال آپ کی درخواست پر پلاٹ کی پیمائش اور نشاندہی کر سکتا ہے۔ اس کا تحریری نتیجہ بعد میں کسی بھی عدالتی کیس میں مفید ثبوت بنتا ہے۔",
      },
      {
        title: "سول عدالت سے چارہ جوئی",
        text: "اگر کسی پڑوسی نے آپ کی زمین پر تعمیر کر لی ہو تو آپ سول عدالت سے درخواست کر سکتے ہیں کہ زمین واپس دلائی جائے اور مزید تعمیر روکی جائے۔",
      },
    ],

    authority: {
      name: "محکمۂ مال (پٹواری اور تحصیلدار)، پھر سول عدالت (ڈیمو مثال)",
      description:
        "محکمۂ مال زمین کا سرکاری ریکارڈ رکھتا ہے اور آپ کی حد کی پیمائش اور نشاندہی کر سکتا ہے۔ اگر معاملہ حل نہ ہو تو سول عدالت اس کا فیصلہ کر سکتی ہے۔ نام اور طریقۂ کار صوبے اور ضلع کے لحاظ سے مختلف ہو سکتے ہیں۔",
      howToReach: [
        "اپنے مقامی پٹواری یا تحصیل دفتر سے شروع کریں اور اپنے پلاٹ کی حد بندی (نشاندہی) کی درخواست کریں۔",
        "اپنا شناختی کارڈ اور زمین کے کاغذات کی نقول ساتھ لے جائیں۔",
        "عدالت کے لیے، مقامی وکیل یا ڈسٹرکٹ بار کا لیگل ایڈ ڈیسک آپ کو کیس دائر کرنے میں مدد دے سکتا ہے۔",
      ],
    },

    timeline: [
      {
        title: "زمین کے کاغذات جمع کریں",
        time: "1 سے 3 دن",
        detail: "اپنی رجسٹری، فرد، نقشہ اور پرانی رسیدیں یا درخواستیں اکٹھی کریں۔",
      },
      {
        title: "حد بندی کی درخواست دیں",
        time: "1 سے 4 ہفتے",
        detail: "محکمۂ مال کو اپنے پلاٹ کی پیمائش اور نشاندہی کی درخواست دیں۔ نتیجے کی تحریری نقل ضرور لیں۔",
      },
      {
        title: "پرسکون طریقے سے تصفیے کی کوشش کریں",
        time: "1 سے 2 ہفتے",
        detail: "نتیجہ اپنے پڑوسی کو دکھائیں، اور ممکن ہو تو معزز بزرگوں یا مقامی ثالث کو شامل کریں۔",
      },
      {
        title: "قانونی نوٹس بھیجیں یا کیس دائر کریں",
        time: "1 سے 2 ہفتے",
        detail:
          "اگر وہ پھر بھی انکار کرے تو وکیل نوٹس بھیج سکتا ہے یا سول عدالت میں دعویٰ دائر کر سکتا ہے، اور مزید تعمیر روکنے کا حکم مانگ سکتا ہے۔",
      },
      {
        title: "پیشیوں پر حاضر ہوں",
        time: "کئی مہینے یا اس سے زیادہ",
        detail: "ہر تاریخ پر اصل کاغذات کے ساتھ جائیں۔ عدالت زمین ناپنے کے لیے سروئیر مقرر کر سکتی ہے۔",
      },
      {
        title: "فیصلہ وصول کریں",
        time: "کیس پر منحصر ہے",
        detail: "عدالت اپنا حکم سمجھائے گی۔ اگر آپ متفق نہ ہوں تو اپنے وکیل سے آگے کے راستوں کے بارے میں پوچھیں۔",
      },
    ],

    documents: [
      "شناختی کارڈ کی نقل (آپ کا اپنا)",
      "پلاٹ کی رجسٹری یا بیع نامہ",
      "فرد یا ریکارڈ آف رائٹس (جمع بندی)",
      "پلاٹ کا نقشہ",
      "انتقال کی نقل، اگر آپ کے پاس ہو",
      "پلاٹ کے پراپرٹی ٹیکس یا یوٹیلیٹی بل",
      "پڑوسی کا نام، پتہ اور فون نمبر",
    ],

    evidence: [
      "دیوار اور پلاٹ کی تاریخ والی تصاویر اور ویڈیوز",
      "آپ کے پلاٹ کی پیمائش، کاغذات کے ساتھ موازنے کے لیے",
      "ایسے پڑوسیوں یا بزرگوں کے نام اور فون نمبر جو حد کے بارے میں جانتے ہوں",
      "پیغامات یا دھمکیوں کے اسکرین شاٹس",
      "آپ نے پہلے جو بھی درخواست یا شکایت دی ہو اس کی نقول",
      "تاریخوں، اوقات اور کہی گئی باتوں کے نوٹس",
    ],

    actionPlan: [
      {
        when: "آج",
        title: "محفوظ رہیں اور دیوار خود نہ گرائیں",
        detail:
          "بحث اور ہاتھا پائی سے بچیں۔ اگر آپ کو دھمکی دی جائے تو قریبی تھانے میں رپورٹ کریں، اور ہنگامی صورت میں 15 پر کال کریں۔",
      },
      {
        when: "اس ہفتے",
        title: "کاغذات اور شواہد جمع کریں",
        detail: "نیچے دی گئی فہرستیں استعمال کریں۔ اصل کاغذات محفوظ رکھیں اور فوٹو کاپیاں بنائیں۔",
      },
      {
        when: "اس ہفتے",
        title: "محکمۂ مال سے حد بندی کی درخواست کریں",
        detail: "اپنے کاغذات کے ساتھ پٹواری یا تحصیل دفتر جائیں اور نتیجہ تحریری طور پر مانگیں۔",
      },
      {
        when: "اس کے بعد",
        title: "وکیل یا لیگل ایڈ دفتر سے بات کریں",
        detail: "انہیں اپنے کاغذات اور حد بندی کا نتیجہ دکھائیں اور پوچھیں کہ نوٹس بھیجنا چاہیے یا کیس دائر کرنا چاہیے۔",
      },
    ],


    lawyerType: {
      type: "جائیداد / زمین کا وکیل",
      reason:
        "اس قسم کا وکیل عام طور پر زمین کی ملکیت اور حد بندی کے تنازعات دیکھتا ہے، جن میں تجاوزات، غیر قانونی تعمیر، اور قبضہ واپس لینے یا تعمیر روکنے کے لیے سول عدالت میں درخواستیں شامل ہیں۔",
      prepare: [
        "آپ کی رجسٹری، فرد اور نقشہ",
        "اگر پہلے سے کوئی حد بندی کا نتیجہ موجود ہو",
        "جو کچھ ہوا اس کی مختصر تحریری ترتیب",
      ],
    },

    caseAssessment: {
      summary:
        "صرف اب تک آپ کی بتائی گئی معلومات کی بنیاد پر، یہاں معاملے کی ایک سادہ زبان میں جھلک ہے۔ یہ عدالت کے فیصلے کی پیشگوئی نہیں ہے۔",
      strengths: [
        "آپ کے مطابق آپ کے پاس پلاٹ کی رجسٹری موجود ہے",
        "آپ نے زور زبردستی استعمال نہیں کی، جو آپ کے قانونی موقف کے لیے بہتر ہے",
        "آپ کو ابھی تک کوئی متضاد قانونی نوٹس نہیں ملا",
      ],
      weaknesses: [
        "حد کی ابھی تک سرکاری طور پر پیمائش نہیں ہوئی",
        "پڑوسی کے ساتھ ابھی تک کوئی تحریری نوٹس کا تبادلہ نہیں ہوا",
      ],
      missingInfo: [
        "حد بندی کا سرکاری نتیجہ",
        "دیوار اور پلاٹ کی تاریخ والی تصاویر",
        "پڑوسی کا اصل دعویٰ، اگر کوئی ہے",
      ],
      evidenceStrength: "moderate",
      preparedness: "needsMore",
      improve: [
        "محکمۂ مال سے سرکاری حد بندی کی درخواست دیں",
        "دیوار اور ارد گرد کے علاقے کی تاریخ والی تصاویر اور ویڈیوز بنائیں",
        "پڑوسی سے ہر بات چیت کا تحریری ریکارڈ رکھیں",
        "کوئی نوٹس بھیجنے یا کیس دائر کرنے سے پہلے وکیل سے بات کریں",
      ],
    },

    legalAid: {
      show: true,
      title: "وکیل کی فیس ادا کرنے میں مدد چاہیے؟",
      text: "اگر آپ وکیل کی فیس برداشت نہیں کر سکتے تو آپ کو مفت قانونی مدد مل سکتی ہے۔ اپنی ڈسٹرکٹ بار ایسوسی ایشن یا ڈسٹرکٹ کورٹس میں لیگل ایڈ کمیٹی کے بارے میں پوچھیں۔",
      options: [
        "ڈسٹرکٹ بار ایسوسی ایشن کا لیگل ایڈ ڈیسک",
        "صوبائی بار کونسل کی لیگل ایڈ کمیٹی",
        "آپ کے شہر میں کام کرنے والی مقامی لیگل ایڈ این جی اوز",
      ],
    },

    sources: [
      {
        title: "صوبائی قوانینِ مال",
        type: "قانون",
        status: "demo",
        note: "زمین کا ریکارڈ اور حد بندی کی پیمائش۔",
      },
      {
        title: "ضابطۂ دیوانی، 1908",
        type: "قانون",
        status: "demo",
        note: "عدالتی کارروائی کا عمومی طریقہ۔",
      },
      {
        title: "اسپیسیفک ریلیف ایکٹ، 1877",
        type: "قانون",
        status: "demo",
        note: "کسی عمل کو روکنے یا واپس کرنے کے احکامات۔",
      },
    ],
  },
};
