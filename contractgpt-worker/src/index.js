// export default {
//   async fetch(request, env, ctx) {

//     if (request.method === "OPTIONS") {
//       return new Response(null, {
//         status: 204,
//         headers: {
//           "Access-Control-Allow-Origin": "*",
//           "Access-Control-Allow-Methods": "POST, OPTIONS",
//           "Access-Control-Allow-Headers": "Content-Type, Authorization",
//         }
//       });
//     }

//     if (request.method !== "POST") {
//       return new Response("仅支持 POST 请求", {
//         status: 405,
//         headers: {
//           "Content-Type": "text/plain",
//           "Access-Control-Allow-Origin": "*"
//         }
//       });
//     }

//     try {
//       const { question, contract } = await request.json();
//      // 我调用的是 DeepSeek 的API令牌
//       const response = await fetch("https://api.deepseek.com/chat/completions", {
//         method: "POST",
//         headers: {
//           "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`,
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           model: "deepseek-chat",
//           messages: [
//             {
//               role: "system",
//               content: "你是一位资深合同审查法律顾问，擅长分析中国劳动合同中对雇员不利的内容，并提出风险建议。"  // 我将AI的身份进行了设定
//             },
//             {
//               role: "user",
//               content: "合同原文如下：\n\n" + contract
//             },
//             {
//               role: "user",
//               content: question
//             }
//           ],
//           stream: false
//         })
//       });

//       const result = await response.json();
//       return new Response(JSON.stringify(result, null, 2), {
//         status: 200,
//         headers: {
//           "Content-Type": "application/json",
//           "Access-Control-Allow-Origin": "*"
//         }
//       });
      

//       return new Response(JSON.stringify({ answer: message }), {
//         status: 200,
//         headers: {
//           "Content-Type": "application/json",
//           "Access-Control-Allow-Origin": "*"
//         }
//       });

//     } catch (err) {
//       return new Response("请求失败：" + err.message, {
//         status: 500,
//         headers: {
//           "Content-Type": "text/plain",
//           "Access-Control-Allow-Origin": "*"
//         }
//       });
//     }
//   }
// };

export default {
  async fetch(request, env, ctx) {
    // CORS 预检处理
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
      });
    }

    // 只接受 POST
    if (request.method !== "POST") {
      return new Response("仅支持 POST 请求", {
        status: 405,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 读取 body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "请求体不是合法 JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const { contract = "", question = "" } = body;

    // 基本校验
    if (!contract || !question) {
      return new Response(JSON.stringify({ error: "缺少 contract 或 question 字段" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 环境变量检查
    if (!env.DEEPSEEK_API_KEY) {
      console.error("DEEPSEEK_API_KEY 未配置");
      return new Response(JSON.stringify({ error: "后端未配置 API Key" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ---- 1) 简单脱敏/归一化函数 ----
    function maskSensitiveText(text) {
      let s = text;

      // 掩盖公司名（常见：公司/有限公司/集团 等） - 用简单规则替换具体名称为 A公司/B公司（尽量保留甲/乙方位置信息）
      s = s.replace(/\b(委托方|甲方|受托方|承接方|乙方)\s*[:：]?\s*([^\n,，；;]{2,60})/gi, (m, p1, p2) => `${p1}: [${p1 === '甲方' || p1 === '委托方' ? 'A公司' : 'B公司'}]`);
      s = s.replace(/\b([A-Za-z0-9\u4e00-\u9fa5\-\·]{2,80}有限公司|股份有限公司|集团公司|公司)\b/g, "[公司]");
      // 掩盖金额、货币
      s = s.replace(/¥?\s?￥?\s?\d{1,3}(?:[,\d]{0,})+(?:\.\d+)?/g, "[金额]");
      s = s.replace(/\d+(?:\.\d+)?\s?(元|人民币|RMB)/gi, "[金额]");
      // 掩盖日期
      s = s.replace(/\b\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2}\b/g, "[日期]");
      s = s.replace(/\b\d{1,2}年\d{1,2}月\d{1,2}日\b/g, "[日期]");
      // 掩盖身份证/统一社会信用代码（简单规则）
      s = s.replace(/\b[0-9A-Z]{10,22}\b/g, "[ID]");
      // 掩盖邮箱、手机号、座机、IP
      s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[邮箱]");
      s = s.replace(/1[3-9]\d{9}/g, "[手机]");
      s = s.replace(/\b0\d{2,3}-\d{7,8}\b/g, "[座机]");
      s = s.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP]");

      // 额外：将“合同编号”后具体值替换
      s = s.replace(/(合同编号[:：]?\s*)([^\s\n,，；;]+)/gi, "$1[合同编号]");

      // 保留段落/格式
      return s;
    }

    // ---- 2) 构造上游 prompt（先加“模拟”声明，再附脱敏文本） ----
    const maskedContract = maskSensitiveText(contract);

    const preface = `【模拟分析说明】以下为**已脱敏的合同样本**，用于法律风险点分析与示例教学，所有公司/金额/日期/联系方式均已替换为占位内容，请仅基于文本结构与条款进行分析，不作为法律意见。\n\n`;

    const systemPrompt = "你是一位资深合同审查法律顾问，擅长识别劳动合同/服务合同/技术合同中对雇员或承包方不利的条款，并给出改进建议。请基于提供的合同文本进行结构化风险分析。";

    const payload = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: preface + maskedContract },
        { role: "user", content: question }
      ],
      stream: false
    };

    // ---- 3) 上游请求：加超时保护 ----
    const API_URL = "https://api.deepseek.com/chat/completions";
    const controller = new AbortController();
    const TIMEOUT_MS = 15000; // 15 秒超时（可调整）
    const timeout = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeout);
      // fetch 抛出的网络错误或 abort
      console.error("上游请求错误或超时：", err.message);
      return new Response(JSON.stringify({
        error: "upstream_network_error",
        message: "访问模型服务超时或网络错误，请稍后重试"
      }, null, 2), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    clearTimeout(timeout);

    // ---- 4) 处理上游返回 ----
    const status = upstreamResponse.status;
    const text = await upstreamResponse.text().catch(e => {
      console.error("读取上游响应文本失败", e.message);
      return "";
    });

    // 如果上游返回非 2xx，给前端简短的可读错误（调试期可以包含部分 upstream body）
    if (!upstreamResponse.ok) {
      console.warn("上游返回非 2xx：", status, text.slice(0, 800));
      return new Response(JSON.stringify({
        error: "upstream_error",
        upstreamStatus: status,
        upstreamBodySnippet: text.slice(0, 800) // 调试期可用，生产可删
      }, null, 2), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 上游正常返回 JSON 字符串（或对象）——直接返回给前端
    // 如果上游返回的是 JSON 格式字符串，可直接转发
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // 如果上游返回的不是 JSON，我们也把原文返回
      console.log("上游返回非 JSON，直接转发文本（已截断）");
      return new Response(text, {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 最后将上游结果返回给前端（调试期：直接转发）
    return new Response(JSON.stringify(parsed, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
};
