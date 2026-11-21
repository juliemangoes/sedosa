// Services, add-ons, locations and intake forms as published on the studio's
// previous Acuity booking page (captured Nov 2026). Used to seed a fresh database;
// after that, everything is edited from the owner dashboard.
import type { FieldType, WeeklyHours } from "./schema";

/** Mon–Sat 9:30 AM – 8:00 PM, closed Sunday (from the studio's posted booking hours). */
export const DEFAULT_HOURS: WeeklyHours = {
  "1": [{ start: "09:30", end: "20:00" }],
  "2": [{ start: "09:30", end: "20:00" }],
  "3": [{ start: "09:30", end: "20:00" }],
  "4": [{ start: "09:30", end: "20:00" }],
  "5": [{ start: "09:30", end: "20:00" }],
  "6": [{ start: "09:30", end: "20:00" }],
  "7": [],
};

export const SEED_LOCATIONS: { name: string; address: string }[] = [
  {
    "name": "Sedosa Covington",
    "address": "2843 Fairview rd, Covington GA 30016"
  },
  {
    "name": "Sedosa Decatur",
    "address": "4336 Covington hwy, Suite 202, Decatur GA 30035"
  }
];

export const SEED_CATEGORIES: string[] = [
  "All Things Brows:)",
  "Korean Lash Lifts♡´･ᴗ･`♡",
  "Lash Lift + Brow Packages<3",
  "Lash Removal<3",
  "PMU SERVICES<3",
  "Waxing!"
];

export const SEED_ADDONS: { name: string; durationMin: number; priceCents: number }[] = [
  {
    "name": "Bottom Lash lift",
    "durationMin": 30,
    "priceCents": 1500
  },
  {
    "name": "Brow Threading",
    "durationMin": 25,
    "priceCents": 1800
  },
  {
    "name": "Brow Wax",
    "durationMin": 30,
    "priceCents": 2500
  },
  {
    "name": "Chin Wax/Thread",
    "durationMin": 10,
    "priceCents": 1000
  },
  {
    "name": "Crystal Globe Massage!",
    "durationMin": 20,
    "priceCents": 1500
  },
  {
    "name": "Jelly Mask",
    "durationMin": 20,
    "priceCents": 2000
  },
  {
    "name": "Lash Extension Removal",
    "durationMin": 30,
    "priceCents": 1000
  },
  {
    "name": "Lash Lift Tint",
    "durationMin": 20,
    "priceCents": 1000
  },
  {
    "name": "Sideburns wax",
    "durationMin": 10,
    "priceCents": 1200
  },
  {
    "name": "Underarm Wax",
    "durationMin": 10,
    "priceCents": 1800
  },
  {
    "name": "Upper Lip Wax or Thread",
    "durationMin": 10,
    "priceCents": 800
  }
];

export const SEED_FORMS: {
  name: string;
  description: string;
  fields: { type: FieldType; label: string; options: string[]; required: boolean }[];
}[] = [
  {
    "name": "Waxing Consent Form.",
    "description": "Fill out “No” if you are not getting wax done with any specific service!",
    "fields": [
      {
        "type": "yesno",
        "label": "Is this your first time getting your wax done?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Have you ever had an allergic reaction to wax?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Are you taking any prescribed acne medication like Accutane or Tretinoin?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Do you frequently use tanning beds?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Are you currently sunburnt?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Are you diabetic?",
        "options": [],
        "required": true
      },
      {
        "type": "checkboxlist",
        "label": "Do you currently have or have you had any of the following medical conditions that could compromise your skin and or services being offered:",
        "options": [
          "AIDS/HIV",
          "Hepatitis",
          "Varicose Veins",
          "Herpes",
          "Cancer",
          "Cold Sores",
          "None of the above"
        ],
        "required": true
      },
      {
        "type": "checkbox",
        "label": "I understand that If I begin using, or are currently using any of the products listed above & do not inform the esthetician prior to current or future treatments, I accept full responsibility  for any allergic reactions or outbreaks.",
        "options": [],
        "required": true
      }
    ]
  },
  {
    "name": "Brows Client Intake / Consent Form!",
    "description": "",
    "fields": [
      {
        "type": "checkboxlist",
        "label": "What are your current brow concerns?",
        "options": [
          "Overgrown",
          "Sparse",
          "Uneven",
          "Patchy",
          "Thin",
          "Other"
        ],
        "required": true
      },
      {
        "type": "checkboxlist",
        "label": "What is your desired brow look?",
        "options": [
          "Natural",
          "Fuller",
          "Defined",
          "Arched",
          "Thicker",
          "Other"
        ],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Check the box below if you would be comfortable being filmed for content purposes during the service.",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Are you currently pregnant or breastfeeding? If yes, the lamination set would not be best suited for you.",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Have you had any previous reactions to hair or beauty treatments?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Have you had any chemical treatments on your eyebrows recently?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Have you ever gotten your brows tinted or laminated?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "Have you ever had an allergic reaction to wax or thread?",
        "options": [],
        "required": true
      },
      {
        "type": "checkboxlist",
        "label": "How frequently do you get your brows waxed or threaded?",
        "options": [
          "Weekly",
          "Monthly",
          "Rarely",
          "On special occasions",
          "Never"
        ],
        "required": true
      },
      {
        "type": "checkboxlist",
        "label": "Please check the box that best describes your skin type?",
        "options": [
          "Dry",
          "Normal",
          "Oily",
          "Combination",
          "Sensitive",
          "Acne-prone",
          "Other"
        ],
        "required": true
      },
      {
        "type": "checkbox",
        "label": "I understand that the above information is important for my safety and the success of the treatment and that failure to disclose any medical conditions or allergies may result in adverse reactions or complications during the service.",
        "options": [],
        "required": true
      },
      {
        "type": "checkbox",
        "label": "I also understand that the artist/esthetician has the right to refuse service if it is deemed unsafe or medically contraindicated.",
        "options": [],
        "required": true
      }
    ]
  },
  {
    "name": "Consent & Liability Waiver",
    "description": "By booking an appointment and receiving services at Sedosa Beauty Studio LLC, you acknowledge and agree to the following terms:\n\n1. Acknowledgment of Risks\n-I understand that all services, including but not limited to tinting, waxing, lamination, and shaping, lash lifts & PMU involve the use of tools, chemicals, and procedures that may pose a risk of adverse reactions.\n-Potential outcomes may include, but are not limited to, redness, irritation, swelling, allergic reactions, burns, hair loss, or other unexpected effects.\n\n2. Disclosure of Medical History\n-I confirm that I have disclosed all relevant information about any allergies, skin sensitivities, medical conditions, or medications that could impact the outcome of my service.\n-I understand that failure to disclose such information increases the risk of adverse reactions, and I accept full responsibility for any resulting outcomes.\n\n3. Post-Service Care\n-I acknowledge that I will be provided with aftercare instructions to follow after my service.\n-I understand that failure to follow aftercare instructions, or engaging in activities that may affect the treated area (e.g., excessive sun exposure, improper cleaning, etc.), is my sole responsibility and may affect the results of my service.\n\n4. Assumption of Responsibility\n-I voluntarily agree to undergo the requested service and assume full responsibility for any adverse reactions or dissatisfaction with the outcome.\n-I understand that Sedosa Beauty Studio and its staff are not liable for any injuries, allergic reactions, skin conditions, hair loss or undesired results that may occur during or after my service.\n-I understand that by booking an appointment an additional $15 will be charged to my card on file in the event of a no-call, no-show.\n\n5. No Guarantees\n-I acknowledge that results may vary depending on my skin type, hair type, adherence to aftercare instructions, and other individual factors.\n-I understand that Sedosa Beauty does not guarantee specific results and is not responsible for outcomes that do not meet my personal expectations.\n- I understand deposits or payments made after service is non-refundable.\n\n6. Release of Liability\n-I release and hold harmless Sedosa Beauty Studio LLC, its owner, and contractors from any and all liability, claims, or damages related to my service, including but not limited to physical, medical, or emotional outcomes.\n\nBy proceeding with my appointment, I confirm that I have read, understood, and agreed to this liability waiver. I voluntarily assume all risks associated with my service and understand that I cannot hold Sedosa Beauty Studio responsible for any adverse outcomes.",
    "fields": [
      {
        "type": "checkbox",
        "label": "By checking, I agree to the terms of the Consent and Liability Waiver",
        "options": [],
        "required": true
      }
    ]
  },
  {
    "name": "Lash lift + Brow package consent form!",
    "description": "Please answer the following before you’re appointment:",
    "fields": [
      {
        "type": "yesno",
        "label": "1. Are you currently pregnant or breastfeeding?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "2. Do you have any eye conditions or infections? (pink eye, styes, irritation, etc.)",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "3. Do you have sensitive skin or any known allergies to cosmetic products?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "4. Have you used Accutane, Retin-A, retinol, or strong exfoliating products around the brow/eye area in the last 7 days?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "5. Have you had a lash lift or brow lamination in the last 6–8 weeks?",
        "options": [],
        "required": true
      },
      {
        "type": "yesno",
        "label": "6. Do you have any recent eye surgeries, permanent makeup, or skin procedures near the brows/eyes?",
        "options": [],
        "required": true
      },
      {
        "type": "checkbox",
        "label": "I understand that lash lifts and/or brow lamination are cosmetic treatments that use chemical solutions to reshape the hair.",
        "options": [],
        "required": true
      },
      {
        "type": "checkbox",
        "label": "I confirm the information above is accurate and understand results vary depending on my natural hair and aftercare",
        "options": [],
        "required": true
      },
      {
        "type": "checkbox",
        "label": "I understand that if I experience irritation or discomfort during the service, I should notify my technician immediately.",
        "options": [],
        "required": true
      },
      {
        "type": "checkbox",
        "label": "I understand I must arrive without eye makeup or oils around the brows/lashes.",
        "options": [],
        "required": true
      },
      {
        "type": "checkbox",
        "label": "By booking this appointment  I consent to receiving a lash lift and/or brow package service.",
        "options": [],
        "required": true
      }
    ]
  }
];

export const SEED_SERVICES: {
  category: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
  paddingBeforeMin: number;
  paddingAfterMin: number;
  locations: string[];
  addons: string[];
  forms: string[];
}[] = [
  {
    "category": "All Things Brows:)",
    "name": "Brow Lami Set<3",
    "description": "Brow Lamination is a unique 3 step treatment process that straightens and relaxes brow hair, resulting in a versatile brow that can be worn fluffy, straight, arched, or sleek. (Lasts 6-8 weeks)\n\n*Includes: Wax or Thread, Shaping, Concealer & Lip mask.",
    "durationMin": 65,
    "priceCents": 9500,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Brows Client Intake / Consent Form!",
      "Consent & Liability Waiver",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "All Things Brows:)",
    "name": "Brow Bundle Lami + Hybrid Stain!",
    "description": "Elevate your brow game with our dynamic duo service, COMBO edition.  Includes hybrid stain that consists of a type of hair dye that dyes the brow hair whilst also staining the skin. Typically lasts 5-10 days on the skin and 4-6 weeks on the hair. Also includes lamination which is a 3 step chemical process that lifts the brows hairs, also lasts 4-6 weeks. \n\n*Includes: Wax or Thread, Shaping, Concealer & Lip mask.",
    "durationMin": 100,
    "priceCents": 11000,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Brows Client Intake / Consent Form!",
      "Consent & Liability Waiver",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "All Things Brows:)",
    "name": "Hybrid Stain or Tint<3 (New Set)",
    "description": "Hybrid stain that consists of a type of hair dye that dyes the brow hair whilst also staining the skin. Typically lasts 5-10 days on the skin and 4-6 weeks on the hair. \nTint consists of coloring only the hairs of the brow, does not stain the skin, best suitable for those with full yet sparse brows. Lasts 2-4 weeks.\n\n*Includes: Wax or Thread, Shaping, Concealer & Lip mask.",
    "durationMin": 80,
    "priceCents": 5500,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Brows Client Intake / Consent Form!",
      "Consent & Liability Waiver",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "All Things Brows:)",
    "name": "2-4 week Brow tint touch up (returning clients only)",
    "description": "Must be within the 2-4 week mark to be able to schedule this service!",
    "durationMin": 75,
    "priceCents": 4000,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Brows Client Intake / Consent Form!",
      "Consent & Liability Waiver",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "All Things Brows:)",
    "name": "Brow Sculpt/Wax<3",
    "description": "Clean up of the brows.\n*Includes: Brow Wax, Shaping, Concealer, & tweezing",
    "durationMin": 30,
    "priceCents": 2500,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Consent & Liability Waiver",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "All Things Brows:)",
    "name": "Brow Sculpt/Thread",
    "description": "",
    "durationMin": 30,
    "priceCents": 1800,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Consent & Liability Waiver"
    ]
  },
  {
    "category": "Korean Lash Lifts♡´･ᴗ･`♡",
    "name": "Korean Lash lift (ONLY)<3",
    "description": "No tint will be added, this set is just for the KLL on its own!",
    "durationMin": 95,
    "priceCents": 7500,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Bottom Lash lift",
      "Brow Threading",
      "Brow Wax",
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Lash Lift Tint",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Consent & Liability Waiver",
      "Lash lift + Brow package consent form!"
    ]
  },
  {
    "category": "Korean Lash Lifts♡´･ᴗ･`♡",
    "name": "Korean Lash lift + Lash Tint!",
    "description": "This service includes tint on the lashes for extra darkness!",
    "durationMin": 105,
    "priceCents": 8500,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Bottom Lash lift",
      "Brow Threading",
      "Brow Wax",
      "Underarm Wax"
    ],
    "forms": [
      "Consent & Liability Waiver",
      "Lash lift + Brow package consent form!"
    ]
  },
  {
    "category": "Korean Lash Lifts♡´･ᴗ･`♡",
    "name": "Korean + Bottom Lash lift + Lash Tint<3",
    "description": "Including Lash tint for both top & bottom lashes<3",
    "durationMin": 120,
    "priceCents": 9500,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Brow Threading",
      "Brow Wax",
      "Lash Lift Tint",
      "Underarm Wax"
    ],
    "forms": []
  },
  {
    "category": "Lash Lift + Brow Packages<3",
    "name": "Lash Lift + Brow Lamination",
    "description": "Includes: Lash tint, aftercare baggy, shaping & brow wax or thread!\n\nBothservices last 6-8 weeks.",
    "durationMin": 180,
    "priceCents": 11500,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Bottom Lash lift",
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Lash Lift Tint",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Consent & Liability Waiver",
      "Lash lift + Brow package consent form!",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "Lash Lift + Brow Packages<3",
    "name": "Lash Lift + Brow hybrid Stain/Tint",
    "description": "",
    "durationMin": 180,
    "priceCents": 9500,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Bottom Lash lift",
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Lash Lift Tint",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Consent & Liability Waiver",
      "Lash lift + Brow package consent form!",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "Lash Lift + Brow Packages<3",
    "name": "Lash Lift + Brow Bundle",
    "description": "Lash lift tint is also included!",
    "durationMin": 190,
    "priceCents": 15000,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Bottom Lash lift",
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Lash Lift Tint",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Consent & Liability Waiver",
      "Lash lift + Brow package consent form!",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "Lash Removal<3",
    "name": "Lash Extension Removal",
    "description": "",
    "durationMin": 30,
    "priceCents": 1500,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Brow Threading",
      "Brow Wax",
      "Lash Extension Removal",
      "Underarm Wax"
    ],
    "forms": [
      "Consent & Liability Waiver"
    ]
  },
  {
    "category": "PMU SERVICES<3",
    "name": "OMBRE POWDER BROWS (CONSULTATION ONLY)",
    "description": "This service is for consultations only! No service will be done during this time only a basic shaping without any hair removal, we will just be sitting down & chatting about all your brows goals & desires and questions, figuring out your favorite shape, signing all consent forms, & scheduling your Permanent brow appointment if you are ready! All Ombre powder brows details will be given the day of your consultation!",
    "durationMin": 100,
    "priceCents": 0,
    "depositCents": 0,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Brow Threading",
      "Brow Wax",
      "Lash Extension Removal",
      "Underarm Wax"
    ],
    "forms": [
      "Consent & Liability Waiver"
    ]
  },
  {
    "category": "PMU SERVICES<3",
    "name": "Ombré Powder Brow Service!",
    "description": "",
    "durationMin": 300,
    "priceCents": 20000,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Brow Threading",
      "Brow Wax",
      "Lash Extension Removal",
      "Underarm Wax"
    ],
    "forms": [
      "Brows Client Intake / Consent Form!",
      "Consent & Liability Waiver"
    ]
  },
  {
    "category": "Waxing!",
    "name": "Underarm Wax!",
    "description": "",
    "durationMin": 30,
    "priceCents": 1800,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Brow Threading",
      "Brow Wax",
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Consent & Liability Waiver",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "Waxing!",
    "name": "Upper Lip Wax!",
    "description": "",
    "durationMin": 15,
    "priceCents": 800,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Brow Threading",
      "Brow Wax",
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Consent & Liability Waiver",
      "Waxing Consent Form."
    ]
  },
  {
    "category": "Waxing!",
    "name": "Chin Wax!",
    "description": "",
    "durationMin": 20,
    "priceCents": 1000,
    "depositCents": 1000,
    "paddingBeforeMin": 0,
    "paddingAfterMin": 0,
    "locations": [
      "Sedosa Covington",
      "Sedosa Decatur"
    ],
    "addons": [
      "Brow Threading",
      "Brow Wax",
      "Chin Wax/Thread",
      "Crystal Globe Massage!",
      "Jelly Mask",
      "Lash Extension Removal",
      "Sideburns wax",
      "Underarm Wax",
      "Upper Lip Wax or Thread"
    ],
    "forms": [
      "Consent & Liability Waiver",
      "Waxing Consent Form."
    ]
  }
];
