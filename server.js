const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

// قم بوضع بياناتك هنا
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_KEY');

// 1. نظام التعدين التلقائي عند فتح البوت
app.post('/api/mine', async (req, res) => {
    const { telegram_id } = req.body;
    
    // جلب بيانات المستخدم
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegram_id)
        .single();

    if (!user) return res.json({ success: false, error: "مستخدم غير موجود" });

    // حساب الوقت والتعدين
    const now = new Date();
    const lastMining = new Date(user.last_mining_time || now);
    const hoursDiff = (now - lastMining) / (1000 * 60 * 60);
    
    // إضافة 10 عملات عن كل ساعة مرت (يمكنك تغيير الرقم 10 حسب رغبتك)
    const earned = hoursDiff * 10;
    const newBalance = user.balance + earned;

    // تحديث قاعدة البيانات
    await supabase
        .from('users')
        .update({ balance: newBalance, last_mining_time: now })
        .eq('telegram_id', telegram_id);

    res.json({ success: true, balance: newBalance });
});

// 2. نظام الاستثمار
app.post('/api/invest', async (req, res) => {
    const { telegram_id, amount } = req.body;
    
    const { data: user } = await supabase.from('users').select('balance').eq('telegram_id', telegram_id).single();
    
    if (user.balance >= amount) {
        // خصم المبلغ
        await supabase.from('users').update({ balance: user.balance - amount }).eq('telegram_id', telegram_id);
        res.json({ success: true });
    } else {
        res.json({ success: false, error: "رصيدك غير كافٍ" });
    }
});

app.listen(3000, () => console.log('Server is running...'));
