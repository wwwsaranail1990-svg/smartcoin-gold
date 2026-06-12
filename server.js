const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json()); // تفعيل استقبال البيانات بصيغة JSON

// عرض واجهة اللعبة index.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// API لجلب بيانات المستخدم عند فتح اللعبة
app.get('/api/user/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', req.params.id)
            .single();
        if (error) return res.status(404).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API لتحديث وحفظ نقاط التعدين في قاعدة البيانات فوراً
app.post('/api/mine', async (req, res) => {
    const { telegram_id, balance } = req.body;
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ balance: balance, last_mining_time: new Date() })
            .eq('telegram_id', telegram_id);
        if (error) return res.status(400).json({ error: error.message });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

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
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', chatId)
            .single();

        if (error && error.code === 'PGRST116') {
            const { data: newUser } = await supabase
                .from('users')
                .insert([{ telegram_id: chatId, username: username }])
                .select()
                .single();
            user = newUser;
        }

        // إرسال رسالة الترحيب مع زر فتح اللعبة على سيرفرك الخاص
        bot.sendMessage(chatId, `🌟 مرحباً بك في بوت تعدين SmartCoin Gold! 🌟\n\nاضغط على الزر أدناه لفتح واجهة التعدين وابدأ بجمع النقاط الآن!`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🚀 فتح التطبيق والتعدين", web_app: { url: `https://smartcoin-gold-xuuc.onrender.com` } }]
                ]
            }
        });

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "عذراً، حدث خطأ أثناء الاتصال بقاعدة البيانات.");
    }
});
