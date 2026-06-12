const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// تجهيز سيرفر وهمي لمنع السيرفر من النوم
const app = express();
app.get('/', (req, res) => res.send('SmartCoin Gold Server is Running!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// جلب المتغيرات البيئية بأمان
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// أمر البداية /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || 'NoUsername';

    try {
        // التحقق من وجود المستخدم أو إنشائه
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', chatId)
            .single();

        if (error && error.code === 'PGRST116') {
            // إذا لم يكن مسجلاً، نقوم بتسجيله فوراً
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{ telegram_id: chatId, username: username }])
                .select()
                .single();
            
            user = newUser;
        }

        // إرسال رسالة الترحيب مع زر فتح اللعبة الرسمي
        bot.sendMessage(chatId, `🌟 مرحباً بك في بوت تعدين SmartCoin Gold! 🌟\n\nاضغط على الزر أدناه لفتح واجهة التعدين وابدأ بجمع النقاط الآن!`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🚀 فتح التطبيق وِالتعدين", web_app: { url: `https://google.com` } }]
                ]
            }
        });

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "عذراً، حدث خطأ أثناء الاتصال بقاعدة البيانات.");
    }
});
