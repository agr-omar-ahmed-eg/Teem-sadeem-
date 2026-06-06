const { GoogleGenAI } = require('@google/genai');

exports.handler = async (event, context) => {
    // حماية السيرفر من الطلبات الغريبة
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt, image } = JSON.parse(event.body);

        // 1. قراءة المفاتيح من الـ Environment Variables اللي أنت ضفتها في Netlify
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;

        const ai = new GoogleGenAI({ apiKey: apiKey });

        // 2. إرسال البيانات لموديل جميناي 2.5 فلاش
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    inlineData: {
                        data: image.inlineData.data,
                        mimeType: image.inlineData.mimeType
                    }
                },
                prompt
            ],
            generationConfig: { responseMimeType: "application/json" }
        });

       let cleanText = aiResponse.text.trim();
if (cleanText.startsWith("```json")) {
    cleanText = cleanText.substring(7, cleanText.length - 3).trim();
} else if (cleanText.startsWith("```")) {
    cleanText = cleanText.substring(3, cleanText.length - 3).trim();
}
const extractedQuestions = JSON.parse(cleanText);


        // 3. إرسال الـ JSON الناتج إلى رابط جوجل سكريبت لإنشاء الفورم
        const googleResponse = await fetch(googleScriptUrl, {
            method: 'POST',
            body: JSON.stringify(extractedQuestions)
        });

        const googleResult = await googleResponse.json();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "success", ...googleResult })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ status: "error", message: error.message })
        };
    }
};

