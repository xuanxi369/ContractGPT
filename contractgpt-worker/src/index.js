export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method !== "POST") {
        return new Response("仅支持 POST 请求", {
          status: 405,
          headers: {
            "Content-Type": "text/plain",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      const { question, contract } = await request.json();
      // 我采用的是 Deepseek 大模型的 API令牌
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "你是一位资深合同审查法律顾问，擅长分析中国劳动合同中对雇员不利的内容，并提出风险建议。" // 我对此AI的身份设定
            },
            {
              role: "user",
              content: "合同原文如下：\n\n" + contract
            },
            {
              role: "user",
              content: question
            }
          ],
          stream: false
        })
      });

      const result = await response.json();
      const message = result?.choices?.[0]?.message?.content || "分析失败，请稍后重试。";  

      return new Response(JSON.stringify({ answer: message }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (err) {
      return new Response("请求失败：" + err.message, {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
