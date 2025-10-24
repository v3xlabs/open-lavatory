import { createTransportLayerBase } from '../index.js';

export const webrtc = () => {
    return createTransportLayerBase({
        type: 'webrtc',
        setup() {
            //
            // const iceServers = [
            //     { urls: 'stun:stun.l.google.com:19302' },
            //     { urls: 'stun:stun1.l.google.com:19302' },
            //     { urls: 'stun:stun.services.mozilla.com:3478' },
            //     {
            //         urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
            //         username: 'openrelayproject',
            //         credential: 'openrelayproject',
            //     },
            // ];
            // this.peerConnection = new RTCPeerConnection({
            //     iceServers,
            //     iceCandidatePoolSize: 10,
            //     iceTransportPolicy: 'all',
            //     bundlePolicy: 'max-bundle',
            //     rtcpMuxPolicy: 'require',
            // });
            // // Connection state handlers
            // this.peerConnection.onconnectionstatechange = () => {
            //     const state = this.peerConnection!.connectionState;
            //     console.log('WebRTC connection state:', state);
            //     if (state === 'connected') {
            //         this.updateConnectionState('webrtc-connected', 'Direct P2P connection established');
            //     } else if (state === 'failed') {
            //         this.retryWebRTC();
            //     } else if (state === 'connecting') {
            //         this.updateConnectionState('webrtc-negotiating', 'Establishing P2P connection...');
            //     }
            // };
            // // ICE candidate handler
            // this.peerConnection.onicecandidate = async (event) => {
            //     if (event.candidate && this.peerPublicKey) {
            //         const encryptedCandidate = await EncryptionUtils.encryptMessage(
            //             event.candidate,
            //             this.peerPublicKey,
            //             this.privateKey!,
            //             this.publicKey!
            //         );
            //         await this.signaling.publish({
            //             type: 'ice-candidate',
            //             payload: encryptedCandidate,
            //             sessionId: this.sessionId!,
            //             timestamp: Date.now(),
            //             senderId: this.peerId,
            //         });
            //     }
            // };
            // // Data channel setup
            // if (this.isInitiator) {
            //     this.dataChannel = this.peerConnection.createDataChannel('openlv-data');
            //     this.setupDataChannel();
            // } else {
            //     this.peerConnection.ondatachannel = (event) => {
            //         this.dataChannel = event.channel;
            //         this.setupDataChannel();
            //     };
            // }
        },
        teardown() {
            //
        },
    });
};
