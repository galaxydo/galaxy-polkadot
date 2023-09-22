import { useState, useEffect } from "react";
import { create, urlSource } from "kubo-rpc-client";
import { ipfsApiUrl, ipfsGatewayUrl } from "../config";

const client = create(new URL(ipfsApiUrl));

export const useIPFSClient = () => {
    const [data, setData] = useState(null);

    const loadScene = async (hash) => {
        console.log('ipfs', 'hash', hash);
        const response = await fetch(`${ipfsGatewayUrl}/ipfs/${hash}`)
            .then(it => {
                if (it.status == 200) {
                    return it.json();
                } else {
                    return it.text();
                }
            });
        console.log('response', response);
        setData(response);
    };

    const saveScene = async (content) => {
        console.log('ipfs', 'content', content);
        try {
            const result = await client.add(JSON.stringify(content));
            console.log('ipfs', 'result', result);
            return [null, result.path];
        } catch (error) {
            console.error('ipfs', error);
            return [error, null];
        }
    };
    
    return { data, loadScene, saveScene };
};
