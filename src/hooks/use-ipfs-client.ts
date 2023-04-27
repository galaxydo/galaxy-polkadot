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
            //   const result = await client.add(urlSource('https://images.unsplash.com/photo-1538370965046-79c0d6907d47?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1769&q=80'));
            console.log('result', result);
            const hash = result.path;
            return [null, result.path];
            //   await rpcClient.call("saveScene", name, cid.toString());
        } catch (error) {
            return [null, error];
        }
    };

    return { data, loadScene, saveScene };
};
