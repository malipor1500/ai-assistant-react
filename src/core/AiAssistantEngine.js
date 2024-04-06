// src/core/MainProcessor.js

import pkg from '../../package.json';
import EventEmitter from './EventEmitter';
import AudioPlayer from './AudioPlayer';
import AudioRecorder from './AudioRecorder';
import FunctionExecutor from './FunctionExecutor';
import Logger from './Logger';

const config = require('./config');

class AiAssistantEngine extends EventEmitter {

    constructor(key, apiUrl = config.apiUrl, debug = false) {

        super();

        Logger.setDebug(debug);
        this.sdkVersion = pkg.version;
        Logger.log(`--[SISTA]-- Initializing AiAssistantEngine Version: ${this.sdkVersion}`);

        this.audioPlayer = new AudioPlayer();
        this.audioRecorder = new AudioRecorder();
        this.functionExecutor = new FunctionExecutor();

        if (!key) {
            throw new Error('Missing API Key for AiAssistantProvider. Get your FREE Key from https://admin.sista.ai/applications');
        }

        this.key = key;
        Logger.log('--[SISTA]-- Using Acesss Key:', '...' + this.key.slice(-8));

        this.apiUrl = apiUrl;
        Logger.log('--[SISTA]-- Using Base URL:', this.apiUrl);

    }

    static init(key, apiUrl, debug = false) {
        return new AiAssistantEngine(key, apiUrl, debug);
    }

    /**
     * Registers the given voice activated functions.
     *
     * @param {Object[]} voiceFunctions - An array of voice functions to register.
     */
    registerFunctions(voiceFunctions) {
        this.functionExecutor.registerFunctions(voiceFunctions);
    }

    /**
     * Handle the full voice interaction process from start to finish.
     *
     * @async
     * @throws Will throw an error if there's an issue accessing the microphone.
     */
    startProcessing = async () => {
        Logger.log('--[SISTA]-- startProcessing');

        this.emitStateChange(EventEmitter.STATE_LISTENING_START);

        this.audioPlayer.playStartTone();

        let userAudioCommand;

        try {
            userAudioCommand = await this.audioRecorder.startRecording();
        } catch (err) {
            Logger.error('Error accessing the microphone:', err);
            this.emitStateChange(EventEmitter.STATE_IDLE);
            return;
        }

        try {
            await this._makeAPIRequest(userAudioCommand);
        } catch (err) {
            Logger.error('Error making API request:', err);
            this.emitStateChange(EventEmitter.STATE_IDLE);
        }
    };

    _makeAPIRequest = async (audioBlob) => {
        Logger.log('--[SISTA]-- _makeAPIRequest');
        this.emitStateChange(EventEmitter.STATE_THINKING_START);

        const formData = new FormData();
        formData.append('sdkVersion', this.sdkVersion);
        formData.append('endUser', JSON.stringify(this._getEndUserDetails()));
        formData.append('audio', audioBlob);
        formData.append(
            'functionsSignatures',
            JSON.stringify(this.functionExecutor.functionSignatures),
        );

        try {
            const response = await fetch(`${this.apiUrl}/processor/run`, {
                method: 'POST',
                headers: {
                    'x-api-key': this.key,
                },
                body: formData,
            });

            const data = await response.json();

            this._handleApiResponse(data);

        } catch (error) {
            Logger.error('Error Calling Sista API:', error);
            this.emitStateChange(EventEmitter.STATE_IDLE);
        }
    };

    _getEndUserDetails() {
        let endUserId = localStorage.getItem('endUserId');
        if (!endUserId) {
            endUserId = Math.random().toString(36).substring(2);
            localStorage.setItem('endUserId', endUserId);
        }

        return {
            endUserAgent: navigator.userAgent,
            generatedEndUserId: endUserId,
            providedEndUserId: ''
        };
    }

    _handleApiResponse = (response) => {
        Logger.log('--[SISTA]-- _handleApiResponse:', response);

        // Check if the response is valid
        if (!response || !response.executableFunctions) {
            Logger.error('Invalid response format:', response);
            return;
        }

        const message = response.executableFunctions;

        // Check if the message exists
        if (!message) {
            Logger.error('Response does not contain a message:', response);
            return;
        }

        // Play audio response if it exists, otherwise handle the rest
        if (response.audioFile) {
            this._handleAudioResponse(response.audioFile);
        } else {
            // Handle executable functions if they exist
            if (message.functions) {
                this._handleExecutableFunctionsResponse(message);
            }

            if (message.content !== null) {
                this._handleTextResponse(message.content);
            }
        }
    };

    _handleAudioResponse = (audioFile) => {
        this.emitStateChange(EventEmitter.STATE_SPEAKING_START);
        this.audioPlayer.playAiReply(audioFile, () => {
            Logger.log('--[SISTA]-- Audio reply has finished playing.');
            this.emitStateChange(EventEmitter.STATE_IDLE);
        });
    };

    _handleExecutableFunctionsResponse = (message) => {
        this.functionExecutor.executeFunctions(message);
        this.emitStateChange(EventEmitter.STATE_IDLE);
        this.audioPlayer.playEndTone();
    };

    _handleTextResponse = (content) => {
        Logger.log('--[SISTA]-- AI Response As Text: In Case You Wanna Display This Somewhere:', content);
    };

}

export default AiAssistantEngine;
