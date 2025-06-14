import { contentTopic, encodeConnectionURL } from 'lib';
import mqtt from 'mqtt';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

// let connection;
// Choose a content topic
// const contentTopic = '/light-guide/1/message/proto';
// const encoder = createEncoder({ contentTopic, ephemeral: true });
// const decoder = createDecoder(contentTopic);

// const contentTopic = '/light-guide/1/message/proto'

const initConnection = async ({ setOfferJson }: { setOfferJson: (offerJson: string) => void }) => {
    const topic = contentTopic('abcdefg');

    console.log('init conn');

    const client = mqtt.connect('wss://test.mosquitto.org:8081/mqtt');

    console.log('client', client);

    client.subscribe(topic, (err, granted) => {
        if (err) {
            console.error('Error subscribing to topic', err);
        }

        console.log('Subscribed to topic', topic, granted);
    });

    client.on('message', (topic, message) => {
        console.log('Received message on topic', topic, message.toString());
    });

    client.on('connect', () => {
        console.log('Connected to MQTT broker');
    });

    const payload = encodeConnectionURL({
        sessionId: 'abcdefg',
        sharedKey: '1234567890',
    });

    console.log('payload', payload);

    setOfferJson(payload);

    setInterval(() => {
        client.publish(topic, 'hello ' + Math.round(Math.random() * 1000), { qos: 1 }, (err) => {
            if (err) {
                console.error('Error publishing message', err);
            }
        });
    }, 3000);

    // const pc = new RTCPeerConnection({
    //     iceServers: [
    //         { urls: 'stun:stun.l.google.com:19302' },
    //         // cloudflare turn server
    //         // {
    //         //   urls: "turn:turn.cloudflare.com:3478",
    //         // }
    //     ],
    // });
    // console.log('pc', pc);
    // // optional: open a data‐channel so connection stays alive
    // const dc = pc.createDataChannel('pair');
    // dc.onopen = () => console.log('data-channel open');
    // // 2) collect ICE + SDP
    // pc.onicecandidate = (evt) => {
    //     if (!evt.candidate) {
    //         // ICE gathering complete
    //         const localDesc = pc.localDescription;
    //         const payload = {
    //             type: localDesc?.type,
    //             sdp: localDesc?.sdp,
    //         };
    //         console.log('payload', payload);
    //         // set here
    //         setOfferJson(JSON.stringify(payload));
    //     }
    // };
    // // 3) create & set local offer
    // const offer = await pc.createOffer();
    // console.log('offer', offer);
    // await pc.setLocalDescription(offer);
    // console.log('local desc', pc.localDescription);
    // setOfferJson(JSON.stringify(pc.localDescription));
    // console.log('init conn');
    // const node = await createWakuNode();
    // console.log('node', node);
    // const node2 = await pairExchange(node);
    // console.log('node2', node2);
    // await subscribeToMessages({
    //     node,
    //     contentTopic,
    //     cb: (message) => {
    //         console.log('message', message);
    //     },
    // });
    // console.log('subbed');
    // console.log(node.libp2p.peerId);
    // setInterval(async () => {
    //     const x = await node.getConnectedPeers();
    //     console.log('peeeeeers', x);
    // }, 1000);
    // await new Promise((resolve) => setTimeout(resolve, 100));
    // await sendMessage({ node, contentTopic, message: 'hello' });
};

export const App = () => {
    const [offerJson, setOfferJson] = useState<string>('');

    //
    return (
        <div>
            <h1>hi</h1>
            <button
                onClick={() => {
                    initConnection({ setOfferJson });
                }}
            >
                Init
            </button>
            <div className="border p-4 bg-white">
                {offerJson && <QRCodeSVG value={offerJson} />}
            </div>
        </div>
    );
};
