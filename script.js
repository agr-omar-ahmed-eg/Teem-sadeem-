async function processImage() {
    const imageInput = document.getElementById('imageUpload');
    const statusArea = document.getElementById('statusArea');
    const submitBtn = document.getElementById('submitBtn');

    // التأكد من أن حقل الصورة موجود وأن المستخدم اختار ملفاً بالفعل لمنع خطأ الـ (reading '0')
    if (!imageInput || !imageInput.files || imageInput.files.length === 0) {
        showStatus("❌ يرجى اختيار صورة الأسئلة أولاً قبل البدء!", "error");
        return;
    }

    const imageFile = imageInput.files[0];

    submitBtn.disabled = true;
    submitBtn.innerText = "جاري قراءة وتحليل الصورة... 🧠";
    showStatus("يتم الآن استدعاء الذكاء الاصطناعي لتحليل ورقة الأسئلة...", "loading");

    try {
        const imagePart = await fileToGenerativePart(imageFile);
        
        const systemPrompt = `أنت مساعد ذكاء اصطناعي خبير. اقرأ الصورة المرفقة واستخرج الأسئلة والاختيارات بدقة عالية وحولها لكائن JSON نقي تماماً بدون أي مقدمات أو شروحات جانبية.
        يجب استخدام الهيكل التالي للـ JSON بالضبط:
        {
          "title": "عنوان الاختبار المستنتج",
          "questions": [
            {
              "question_text": "نص السؤال هنا",
              "choices": ["الاختيار 1", "الاختيار 2", "الاختيار 3", "الاختيار 4"],
              "correct_answer": "نص الإجابة الصحيحة المطابق تماماً لأحد الاختيارات، وإذا لم تكن هناك إجابة واضحة في الصورة اترك الحقل فارغاً هكذا ''"
            }
          ]
        }`;

        const response = await fetch('/.netlify/functions/process-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: systemPrompt,
                image: imagePart
            })
        });

        const result = await response.json();

        if (result.status === "success" && result.formUrl) {
            showStatus(`
                🎉 تم إنشاء الاختبار بنجاح!<br><br>
                <a href="${result.formUrl}" target="_blank">📝 اضغط هنا لتعديل وفحص الاختبار</a><br><br>
                <a href="${result.publishedUrl}" target="_blank">🔗 اضغط هنا لرابط حل الطلاب</a>
            `, "success");
        } else {
            showStatus("❌ حدث خطأ من خادم جوجل: " + (result.message || "فشلت العملية"), "error");
        }

    } catch (error) {
        showStatus("❌ حدث خطأ أثناء المعالجة: " + error.message, "error");
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "بدء المعالجة والإنشاء 🚀";
    }
}

// دالة مساعدة لتحويل الصورة بأمان
function fileToGenerativePart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({
                inlineData: { data: base64Data, mimeType: file.type },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showStatus(message, type) {
    const statusArea = document.getElementById('statusArea');
    if (statusArea) {
        statusArea.style.display = "block";
        statusArea.innerHTML = message;
        statusArea.className = type;
    }
}
