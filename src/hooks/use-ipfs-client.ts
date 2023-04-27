import { useState, useEffect } from "react";
import { create, urlSource } from "kubo-rpc-client";

const client = create(new URL("https://ipfs.galaxydo.space"));

export const useIPFSClient = () => {
    const [data, setData] = useState(null);

    const loadScene = async (hash) => {
        const response = await fetch("https://gateway.galaxydo.space/ipfs/" + hash)
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
        try {
            const result = await client.add(content);
            console.log('result', result);
            return [null, result.path];
        } catch (error) {
            return [error, null];
        }
    };
    
    return { data, loadScene, saveScene };
};
