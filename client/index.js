import { config } from 'dotenv';
import readline from 'readline/promises'
import { GoogleGenAI } from "@google/genai"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"


config()
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


const chatHistory = [];
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let client;
const baseUrl = new URL("http://localhost:3001/sse");
try {
    client = new Client({
        name: 'sse-client',
        version: '1.0.0'
    });
    const sseTransport = new SSEClientTransport(baseUrl);
    await client.connect(sseTransport);
    let tools = (await client.listTools()).tools
    console.log("Connected using SSE transport", tools);

} catch (error) {
    console.error("Error connecting to server:", error);
    process.exit(1);
}

async function chatLoop() {
    const question = await rl.question('You: ');
    chatHistory.push({
        role: "user",
        parts: [
            {
                text: question,
                type: "text"
            }
        ]
    })


    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: chatHistory,
    })
    const responseText = response.candidates[0].content.parts[0].text


    chatHistory.push({
        role: "model",
        parts: [
            {
                text: responseText,
                type: "text"
            }
        ]
    })

    console.log(`AI: ${responseText}`)
    chatLoop()

    if (question === "exit") {
        rl.close();
        return;
    }

}


chatLoop()

