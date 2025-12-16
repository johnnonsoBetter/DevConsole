"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookChatParticipant = void 0;
const vscode = __importStar(require("vscode"));
class WebhookChatParticipant {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.participant = null;
        this.state = {
            isBusy: false,
            currentRequestId: null,
            lastActivity: Date.now(),
        };
        // Queue of pending requests
        this.pendingRequests = new Map();
        // Event emitter for state changes
        this.stateChangeEmitter = new vscode.EventEmitter();
        this.onStateChange = this.stateChangeEmitter.event;
    }
    /**
     * Register the @webhook chat participant
     */
    register(context) {
        // Create the chat participant
        this.participant = vscode.chat.createChatParticipant("webhook-copilot.webhook", this.handleChatRequest.bind(this));
        this.participant.iconPath = new vscode.ThemeIcon("webhook");
        context.subscriptions.push(this.participant);
        context.subscriptions.push(this.stateChangeEmitter);
        this.outputChannel.appendLine("@webhook chat participant registered");
    }
    /**
     * Handle chat requests from the VS Code chat UI
     */
    async handleChatRequest(request, chatContext, stream, token) {
        // This handles direct @webhook usage in chat
        // We just pass through to the language model
        try {
            this.setBusy(true, "chat-ui");
            const response = await this.callLanguageModel(request.prompt, stream, token);
            return response;
        }
        finally {
            this.setBusy(false, null);
        }
    }
    /**
     * Process a webhook request programmatically
     * This is called by the webhook server
     */
    async processWebhookRequest(requestId, request) {
        this.outputChannel.appendLine(`Processing webhook request: ${requestId}`);
        // If we have images, we need to use the language model API directly
        // because the chat command doesn't support multimodal content
        if (request.images && request.images.length > 0) {
            return this.processWebhookWithImages(requestId, request);
        }
        // Format the message
        const formattedPrompt = this.formatPrompt(request);
        // Log key info before opening chat
        this.outputChannel.appendLine(`[Chat Open] Opening Copilot Chat with @webhook participant`);
        this.outputChannel.appendLine(`[Chat Open] Request ID: ${requestId}`);
        this.outputChannel.appendLine(`[Chat Open] Prompt: ${request.prompt?.substring(0, 100)}${request.prompt && request.prompt.length > 100 ? "..." : ""}`);
        this.outputChannel.appendLine(`[Chat Open] Has context: ${!!request.context}`);
        this.outputChannel.appendLine(`[Chat Open] Query: @webhook ${formattedPrompt.substring(0, 50)}...`);
        // Open chat with our participant and the formatted message
        // This will trigger handleChatRequest above
        await vscode.commands.executeCommand("workbench.action.chat.open", {
            query: `@webhook ${formattedPrompt}`,
        });
        this.outputChannel.appendLine(`[Chat Open] Successfully opened chat with @webhook participant`);
        // Return immediately - the response streams to the chat UI
        return {
            success: true,
            message: "Request sent to @webhook chat participant",
        };
    }
    /**
     * Process a webhook request with images using the language model API directly
     * This bypasses the chat UI since it doesn't support multimodal content
     */
    async processWebhookWithImages(requestId, request) {
        this.outputChannel.appendLine(`Processing webhook with ${request.images?.length || 0} image(s): ${requestId}`);
        try {
            this.setBusy(true, requestId);
            // Select a chat model (Copilot with vision support)
            const models = await vscode.lm.selectChatModels({
                vendor: "copilot",
                family: "gpt-4o",
            });
            if (models.length === 0) {
                return {
                    success: false,
                    message: "No Copilot model available",
                    metadata: { error: "NO_MODEL" },
                };
            }
            const model = models[0];
            this.outputChannel.appendLine(`Using model: ${model.name}`);
            // Build message content with images and text
            const messageContent = [];
            // Add images first (vision models expect images before text)
            if (request.images) {
                for (let i = 0; i < request.images.length; i++) {
                    const image = request.images[i];
                    try {
                        this.outputChannel.appendLine(`Processing image ${i + 1}/${request.images.length}: mimeType=${image.mimeType}, dataLength=${image.data?.length || 0}`);
                        // Validate image data
                        if (!image.data || image.data.length === 0) {
                            this.outputChannel.appendLine(`Warning: Image ${i + 1} has no data, skipping`);
                            continue;
                        }
                        // Convert base64 to Uint8Array
                        const binaryString = atob(image.data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let j = 0; j < binaryString.length; j++) {
                            bytes[j] = binaryString.charCodeAt(j);
                        }
                        this.outputChannel.appendLine(`Decoded image ${i + 1}: ${bytes.length} bytes`);
                        // Create image data part
                        const imagePart = vscode.LanguageModelDataPart.image(bytes, image.mimeType);
                        messageContent.push(imagePart);
                        // Add description if provided
                        if (image.description) {
                            messageContent.push(new vscode.LanguageModelTextPart(`[Image ${i + 1}: ${image.description}]`));
                        }
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Error processing image ${i + 1}: ${error}`);
                    }
                }
            }
            // Add the formatted prompt
            const formattedPrompt = this.formatPrompt(request);
            messageContent.push(new vscode.LanguageModelTextPart(formattedPrompt));
            // Log what we're sending
            this.outputChannel.appendLine(`Sending to model: ${messageContent.length} parts (${request.images?.length || 0} images + text)`);
            // Build messages
            const messages = [
                vscode.LanguageModelChatMessage.User(messageContent),
            ];
            // Create a cancellation token
            const tokenSource = new vscode.CancellationTokenSource();
            // Send to model
            const response = await model.sendRequest(messages, {}, tokenSource.token);
            // Collect the response
            let fullResponse = "";
            for await (const chunk of response.text) {
                fullResponse += chunk;
            }
            this.outputChannel.appendLine(`Received response (${fullResponse.length} chars) for webhook: ${requestId}`);
            // Build a summary of the image request for the chat
            const imageCount = request.images?.length || 0;
            const imageSummary = imageCount === 1 ? "1 image" : `${imageCount} images`;
            // Log key info before opening chat
            this.outputChannel.appendLine(`[Chat Open] Opening Copilot Chat with image analysis results`);
            this.outputChannel.appendLine(`[Chat Open] Images processed: ${imageCount}`);
            this.outputChannel.appendLine(`[Chat Open] Prompt: ${request.prompt?.substring(0, 100)}${request.prompt && request.prompt.length > 100 ? "..." : ""}`);
            this.outputChannel.appendLine(`[Chat Open] Response length: ${fullResponse.length} chars`);
            // Open chat and show the response with better formatting
            // Note: We use @webhook so users can continue the conversation
            await vscode.commands.executeCommand("workbench.action.chat.open", {
                query: `@webhook 📷 **Image Analysis** (${imageSummary})\n\n${request.prompt}\n\n---\n\n**AI Response:**\n\n${fullResponse}`,
            });
            this.outputChannel.appendLine(`[Chat Open] Successfully opened chat with image analysis`);
            return {
                success: true,
                message: "Image request processed successfully",
                metadata: {
                    responseLength: fullResponse.length,
                    imagesProcessed: request.images?.length || 0,
                },
            };
        }
        catch (error) {
            this.outputChannel.appendLine(`Error processing webhook with images: ${error}`);
            return {
                success: false,
                message: "Failed to process image request",
                metadata: { error: String(error) },
            };
        }
        finally {
            this.setBusy(false, null);
        }
    }
    /**
     * Call the language model directly
     */
    async callLanguageModel(prompt, stream, token, images) {
        try {
            // Select a chat model (Copilot)
            const models = await vscode.lm.selectChatModels({
                vendor: "copilot",
                family: "gpt-4o",
            });
            if (models.length === 0) {
                stream.markdown("❌ No Copilot model available. Make sure GitHub Copilot is installed and signed in.");
                return { metadata: { error: "NO_MODEL" } };
            }
            const model = models[0];
            this.outputChannel.appendLine(`Using model: ${model.name}`);
            // Build message content - can include text and images
            const messageContent = [];
            // Add images first if provided (vision models expect images before text)
            if (images && images.length > 0) {
                this.outputChannel.appendLine(`Including ${images.length} image(s) in request`);
                for (const image of images) {
                    try {
                        // Convert base64 to Uint8Array
                        const binaryString = atob(image.data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        // Create image data part
                        const imagePart = vscode.LanguageModelDataPart.image(bytes, image.mimeType);
                        messageContent.push(imagePart);
                        // Add description if provided
                        if (image.description) {
                            messageContent.push(new vscode.LanguageModelTextPart(`[Image: ${image.description}]`));
                        }
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`Error processing image: ${error}`);
                    }
                }
            }
            // Add the text prompt
            messageContent.push(new vscode.LanguageModelTextPart(prompt));
            // Build messages with multimodal content
            const messages = [
                vscode.LanguageModelChatMessage.User(messageContent),
            ];
            // Send to model and stream response
            const response = await model.sendRequest(messages, {}, token);
            let fullResponse = "";
            for await (const chunk of response.text) {
                stream.markdown(chunk);
                fullResponse += chunk;
            }
            return {
                metadata: {
                    responseLength: fullResponse.length,
                    imagesIncluded: images?.length || 0,
                },
            };
        }
        catch (error) {
            if (error instanceof vscode.LanguageModelError) {
                stream.markdown(`\n\n❌ **Error:** ${error.message}`);
                if (error.code === "NotFound") {
                    stream.markdown("\n\nMake sure GitHub Copilot is installed and you're signed in.");
                }
            }
            else {
                stream.markdown(`\n\n❌ **Error:** ${String(error)}`);
            }
            return { metadata: { error: String(error) } };
        }
    }
    /**
     * Format the prompt with context
     */
    formatPrompt(request) {
        const parts = [];
        const ctx = request.context;
        if (ctx) {
            const contextLines = [];
            if (ctx.log) {
                contextLines.push(`**Log:**\n\`\`\`\n${ctx.log}\n\`\`\``);
            }
            if (ctx.stackTrace) {
                contextLines.push(`**Stack trace:**\n\`\`\`\n${ctx.stackTrace}\n\`\`\``);
            }
            if (ctx.file) {
                const lineRef = ctx.line ? `:${ctx.line}` : "";
                contextLines.push(`**File:** \`${ctx.file}${lineRef}\``);
            }
            // Other context fields
            const knownFields = ["log", "stackTrace", "file", "line", "source"];
            for (const [key, value] of Object.entries(ctx)) {
                if (!knownFields.includes(key) && value) {
                    contextLines.push(`**${key}:** ${JSON.stringify(value)}`);
                }
            }
            if (contextLines.length > 0) {
                parts.push("## Context\n" + contextLines.join("\n\n"));
            }
        }
        parts.push("## Request\n" + request.prompt);
        return parts.join("\n\n");
    }
    /**
     * Set busy state
     */
    setBusy(isBusy, requestId) {
        this.state = {
            isBusy,
            currentRequestId: requestId,
            lastActivity: Date.now(),
        };
        this.stateChangeEmitter.fire(this.state);
        this.outputChannel.appendLine(`Chat state: ${isBusy ? "busy" : "idle"}${requestId ? ` (${requestId})` : ""}`);
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Check if the participant is busy
     */
    isBusy() {
        return this.state.isBusy;
    }
    dispose() {
        if (this.participant) {
            this.participant.dispose();
        }
        this.stateChangeEmitter.dispose();
    }
}
exports.WebhookChatParticipant = WebhookChatParticipant;
//# sourceMappingURL=webhookChatParticipant.js.map