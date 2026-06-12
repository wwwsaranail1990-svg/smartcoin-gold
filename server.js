const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

// عرض واجهة اللعبة للمستخدمين
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// API لجلب بيانات المستخدم
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

// API لتحديث وحفظ نقاط التعدين
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


app.post('/api/invest', async (req, res) => {
    const { telegram_id, amount } = req.body;
    const { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegram_id).single();
    
    if (user.balance < amount) return res.json({ error: "رصيد غير كافٍ" });

    await supabase.from('users').update({ 
        balance: user.balance - amount,
        invested_amount: amount,
        is_investing: true 
    }).eq('telegram_id', telegram_id);
    
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// جلب المتغيرات البيئية من منصة Render
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// تعيين معرف التلجرام الخاص بك كمدير للمشروع
const ADMIN_ID = 7018561132; 

// أمر البداية للمستخدمين
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

// أمر فتح لوحة التحكم للمطور
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;

    if (chatId !== ADMIN_ID) {
        return bot.sendMessage(chatId, "❌ عذراً، هذا الأمر مخصص لمدير البوت فقط.");
    }

    try {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        const userCount = count || 0;

        bot.sendMessage(chatId, `👑 أهلاً بك في لوحة تحكم SmartCoin Gold 👑\n\n📊 عدد المشتركين الإجمالي: ${userCount} مستخدم\n\nإليك الأوامر المتاحة لك كمدير:\n\n🔹 لتعديل رصيد مستخدم:\n<code>/setbalance [ID] [الرصيد]</code>`, { parse_mode: 'HTML' });

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "حدث خطأ أثناء جلب إحصائيات اللوحة.");
    }
});

// أمر الإدارة لتعديل رصيد أي لاعب
bot.onText(/\/setbalance (\d+) (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId !== ADMIN_ID) return;

    const targetUser = match[1];
    const newBalance = parseFloat(match[2]);

    try {
        const { error } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('telegram_id', targetUser);

        if (error) throw error;
        bot.sendMessage(chatId, `✅ تم تحديث رصيد المستخدم ${targetUser} بنجاح إلى ${newBalance} عملة.`);
        bot.sendMessage(targetUser, `💰 تم شحن حسابك بواسطة الإدارة! رصيدك الجديد هو: ${newBalance} عملة.`);
    } catch (err) {
        bot.sendMessage(chatId, `❌ فشل التحديث: ${err.message}`);
    }
});
