import { createWakuNode, pairExchange, sendMessage, subscribeToMessages } from 'lib';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

// let connection;
// Choose a content topic
// const contentTopic = '/light-guide/1/message/proto';
// const encoder = createEncoder({ contentTopic, ephemeral: true });
// const decoder = createDecoder(contentTopic);

const contentTopic = '/light-guide/1/message/proto';

const initConnection = async ({ setOfferJson }: { setOfferJson: (offerJson: string) => void }) => {
    // console.log('init conn');
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

    console.log('init conn');

    const node = await createWakuNode();

    console.log('node', node);

    const node2 = await pairExchange(node);

    console.log('node2', node2);

    await subscribeToMessages({
        node,
        contentTopic,
        cb: (message) => {
            console.log('message', message);
        },
    });

    console.log('subbed');

    await new Promise((resolve) => setTimeout(resolve, 100));

    await sendMessage({ node, contentTopic, message: 'hello' });
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
