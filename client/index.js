import { config } from 'dotenv';
import readline from 'readline/promises'
import { GoogleGenAI } from "@google/genai"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"


config()
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
let tools = []

const chatHistory = [];
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Function to handle function calls
let client;
const baseUrl = new URL("http://localhost:3001/sse");
try {
    client = new Client({
        name: 'sse-client',
        version: '1.0.0'
    });
    const sseTransport = new SSEClientTransport(baseUrl);
    await client.connect(sseTransport);
    tools = (await client.listTools()).tools.map(tool => {
        return {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: tool.inputSchema.type,
                properties: tool.inputSchema.properties,
                required: tool.inputSchema.required
            }
        }
    })

    chatLoop()


} catch (error) {
    console.error("Error connecting to server:", error);
    process.exit(1);
}

// Function to handle function calls
async function chatLoop(toolCall) {

    // Get the last message from the chat history
    if (toolCall) {

        console.log("calling tool ", toolCall.name)

        chatHistory.push({
            role: "model",
            parts: [
                {
                    text: `calling tool ${toolCall.name}`,
                    type: "text"
                }
            ]
        })

        const toolResult = await client.callTool({
            name: toolCall.name,
            arguments: toolCall.args
        })

        chatHistory.push({
            role: "user",
            parts: [
                {
                    text: "Tool result : " + toolResult.content[0].text,
                    type: "text"
                }
            ]
        })

    } else {
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
    }


    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: chatHistory,
        config: {
            tools: [
                {
                    functionDeclarations: tools,
                }
            ]
        }
    })
    const responseText = response.candidates[0].content.parts[0].text
    const functionCall = response.candidates[0].content.parts[0].functionCall

    if (functionCall) {
        return chatLoop(functionCall)
    }


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

    // if (question === "exit") {
    //     rl.close();
    //     return;
    // }

}

