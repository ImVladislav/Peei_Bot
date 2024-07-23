const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const path = require("path");
const crypto = require("crypto");

const app = express();
const token = process.env.TELEGRAM_BOT_TOKEN;
const liqpayPublicKey = process.env.LIQPAY_PUBLIC_KEY;
const liqpayPrivateKey = process.env.LIQPAY_PRIVATE_KEY;

if (!token || !liqpayPublicKey || !liqpayPrivateKey) {
  console.error(
    "Error: TELEGRAM_BOT_TOKEN, LIQPAY_PUBLIC_KEY, or LIQPAY_PRIVATE_KEY is not defined in the environment variables."
  );
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.on("polling_error", (error) => console.log(error));

// Define language selection keyboard
const languageKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "🇺🇦 Українська", callback_data: "lang_uk" }],
      [{ text: "🇬🇧 English", callback_data: "lang_en" }],
    ],
  },
};

// Define menu options
const menuOptions = {
  en: {
    aboutUs: "About Us",
    donate: "Donate to Projects",
    offerAgreement: "Offer Agreement",
  },
  ua: {
    aboutUs: "Коротко про нас",
    donate: "Задонатити проекти",
    offerAgreement: "Договір оферти",
  },
};

const aboutUsText = {
  en: "The Platform of Eco-Energy Initiatives unites activists' efforts to promote a sustainable and environmentally friendly future. Through innovative technologies and collaboration with experts in resource recovery, we aim to reduce the negative impact of waste on our environment.",
  ua: "Платформа еко-енергетичних ініціатив об'єднує зусилля активістів для сприяння сталому та екологічно безпечному майбутньому. За допомогою інноваційних технологій та співпраці з експертами у сфері відновлення ресурсів, ми прагнемо до зменшення негативного впливу відходів на наше середовище.",
};

const donateText = {
  en: "Donate",
  ua: "Задонатити",
};

const offerAgreementText = {
  en: "https://peei.org.ua/officialDocuments/offert_contract",
  ua: "https://peei.org.ua/uk/officialDocuments/offert_contract",
};

const projectDescription = {
  en: "Since the beginning of the war, russian occupiers have been destroying Ukraine's energy system, leading to a critical situation in the energy supply to consumers. Due to constant power outages, Ukrainian schoolchildren are unable to study fully and uninterruptedly. The use of gasoline and diesel generators is accompanied by several drawbacks: they create significant noise, which distracts and negatively affects children's health; they emit harmful exhaust gases; they have a limited motor resource and depend on expensive fuel and require constant maintenance. The project “Energy from hybrid solar power plants for schools” aims to meet 100% of the school's electricity needs with minimal maintenance costs during the educational process. The goal is to ensure uninterrupted power supply to the educational institution for children. The pilot project will be implemented at the Rozhniv branch of the Pukhivsky ZZSO school. The project includes the development of project and technical documentation, selection of a contractor, purchase of equipment, and installation of a hybrid solar power plant with a total capacity of 30 kW by the end of 2024. Our team plans to conclude contracts with partners and raise funds in the amount of 2,036,868 UAH for the implementation of the project. This will contribute to sustainable development and accessible education for students.",
  ua: "З початку війни російські окупанти знищують енергосистему України, що призвело до критичної ситуації в енергопостачанні абонентів. Через постійні відключення світла українські школярі не мають змоги повноцінно та безперешкодно навчатися. Використання бензинових і дизельних генераторів супроводжується низкою недоліків: вони створюють значний шум, який відволікає та негативно впливає на здоров'я дітей; виділяють шкідливі вихлопні гази; мають обмежений моторесурс, а також залежать від дорогого пального та потребують постійного обслуговування. Проект “Енергія від гібридних електростанцій на сонячних панелях для шкіл” спрямований забезпечити 100% потреб школи в електроенергії з мінімальними витратами на обслуговування і утримання системи під час навчального процесу. Мета — забезпечити безперебійне електропостачання навчального закладу для дітей. Пілотний проект реалізовуватиметься на базі Рожнівської філії Пухівського ЗЗСО школи. Проект включає в себе розробку проектної та технічної документації, визначення підрядника, закупівлю обладнання та встановлення гібридної електростанції на сонячних панелях загальною потужністю 30 кВт до кінця 2024 року. Наша команда планує укласти договори з партнерами та залучити кошти у розмірі 2 036 868 грн для реалізації проекту. Це сприятиме сталому розвитку та доступній освіті учнів.",
};

const projectTitle = {
  en: 'PROJECT "GREEN LIGHT FOR EDUCATION: HYBRID SOLAR SOLUTIONS FOR SCHOOLS"',
  ua: 'ПРОЄКТ "ЗЕЛЕНЕ СВІТЛО ДЛЯ ОСВІТИ: ГІБРИДНІ СОНЯЧНІ РІШЕННЯ ДЛЯ ШКІЛ"',
};
const back = {
  en: "Back",
  ua: "Назад",
};

const currencySelection = {
  en: "Choose currency:",
  ua: "Виберіть валюту:",
};

const amountRequest = {
  en: "Please enter the amount (minimum 20):",
  ua: "Будь ласка, введіть суму (мінімум 20):",
};

const invalidAmount = {
  en: "Invalid amount. Please enter a anount greater than 20:",
  ua: "Неправильна сума. Будь ласка, введіть сумму більше 20:",
};
const paymentDescription = {
  en: "Charity donation",
  ua: "Благодійна пожертва",
};
const makeApayment = {
  en: "Follow the link to the donation page",
  ua: "Перейдіть за посиланням на сторінку для донату",
};

// Store user language and donation preferences
const userPreferences = {};

// Function to create main menu keyboard based on language
const createMainMenuKeyboard = (lang) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: menuOptions[lang].aboutUs, callback_data: "aboutUs" }],
      [{ text: menuOptions[lang].donate, callback_data: "donate" }],
      [{ text: menuOptions[lang].offerAgreement, callback_data: "offer" }],
      [{ text: back[lang], callback_data: `back_${lang}` }],
    ],
  },
});

// Function to create project menu keyboard
const createProjectMenuKeyboard = (lang) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: projectTitle[lang], callback_data: "project" }],
      [{ text: back[lang], callback_data: `back_to_main_${lang}` }],
    ],
  },
});

// Function to create currency selection keyboard
const createCurrencyKeyboard = (lang) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: "USD", callback_data: "currency_usd" }],
      [{ text: "UAH", callback_data: "currency_uah" }],
      [{ text: back[lang], callback_data: `back_to_projects_${lang}` }],
    ],
  },
});

// Function to create donate keyboard
const createDonateKeyboard = (lang) => ({
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: donateText[lang],
          callback_data: "choose_currency",
        },
      ],
      [{ text: back[lang], callback_data: `back_to_projects_${lang}` }],
    ],
  },
});

// LiqPay payment creation function
const createLiqPayPayment = (
  amount,
  currency,
  description,
  order_id,
  language
) => {
  const params = {
    public_key: liqpayPublicKey,
    version: "3",
    action: "pay",
    amount: amount,
    currency: currency,
    description: description,
    order_id: order_id,
    language: language,
    sandbox: "1", // Remove this line when going live
  };

  const data = Buffer.from(JSON.stringify(params)).toString("base64");
  const signature = crypto
    .createHash("sha1")
    .update(liqpayPrivateKey + data + liqpayPrivateKey)
    .digest("base64");

  return { data, signature };
};

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Please choose your language / Будь ласка, оберіть мову",
    languageKeyboard
  );
});
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Please choose your language / Будь ласка, оберіть мову",
    languageKeyboard
  );
});

// Handle callback queries
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const callbackData = query.data;

  if (callbackData.startsWith("lang_")) {
    // Handle language selection
    const lang = callbackData === "lang_uk" ? "ua" : "en";
    userPreferences[chatId] = { lang }; // Store user's language preference
    bot.sendMessage(
      chatId,
      `Ви вибрали ${callbackData === "lang_uk" ? "Українська" : "English"}.`,
      createMainMenuKeyboard(lang)
    );
  } else {
    const userPref = userPreferences[chatId];
    const lang = userPref.lang; // Get user's language preference

    if (callbackData === "aboutUs") {
      // Handle About Us text
      bot.sendMessage(chatId, aboutUsText[lang]);
    } else if (callbackData === "donate") {
      // Handle Donate options
      bot.sendMessage(
        chatId,
        donateText[lang],
        createProjectMenuKeyboard(lang)
      );
    } else if (callbackData === "project") {
      // Handle Project description
      bot.sendMessage(
        chatId,
        projectDescription[lang],
        createDonateKeyboard(lang)
      );
      }
      // else if (callbackData === "offer") {
      // Handle offer document based on language
      // const filePath =
      //   lang === "ua"
      //     ? path.join(__dirname, "public", "PublicOfferUA.docx")
      //     : path.join(__dirname, "public", "PublicOffer.docx");
      // bot.sendDocument(chatId, filePath);
       else if (callbackData === "offer") {
         // const { lang } = userPreferences[chatId];
         // const offerUrl = lang === "ua" ? "https://peei.org.ua/uk/public-offer" : "https://peei.org.ua/en/public-offer";
         bot.sendMessage(chatId, offerAgreementText[lang]);
       } else if (callbackData === `back_to_main_${lang}`) {
         // Handle back to main menu
         bot.sendMessage(
           chatId,
           "Please choose an option / Будь ласка, оберіть опцію",
           createMainMenuKeyboard(lang)
         );
       } else if (callbackData === `back_to_projects_${lang}`) {
         // Handle back to projects menu
         bot.sendMessage(
           chatId,
           donateText[lang],
           createProjectMenuKeyboard(lang)
         );
       } else if (callbackData === `back_${lang}`) {
         // Handle back to language selection
         bot.sendMessage(chatId, "Оберіть мову:", languageKeyboard);
       } else if (callbackData === "choose_currency") {
         // Handle currency selection
         bot.sendMessage(
           chatId,
           currencySelection[lang],
           createCurrencyKeyboard(lang)
         );
       } else if (callbackData.startsWith("currency_")) {
         // Handle amount input
         const currency = callbackData.split("_")[1].toUpperCase();
         userPreferences[chatId].currency = currency;
         bot.sendMessage(chatId, amountRequest[lang]);
       }
  }
});
// Handle text messages for amount input
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const userPref = userPreferences[chatId];
  if (!userPref || !userPref.currency) return; // Skip if not in amount input step

  const amount = parseFloat(text);
  const lang = userPref.lang;
  const language = lang === "ua" ? "uk" : "en"; // Set language for LiqPay

  if (isNaN(amount) || amount < 20) {
    bot.sendMessage(chatId, invalidAmount[lang]);
  } else {
    const order_id = Date.now(); // Unique order ID
    const description = paymentDescription[lang];
    const { data, signature } = createLiqPayPayment(
      amount,
      userPref.currency,
      description,
      order_id,
      language
    );

    const paymentLink = `https://www.liqpay.ua/api/3/checkout?data=${data}&signature=${signature}`;
    bot.sendMessage(chatId, `${makeApayment[lang]} : ${paymentLink}`);

    // Reset currency in user preferences after payment link generation
    delete userPreferences[chatId].currency;
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
