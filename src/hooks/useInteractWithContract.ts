// import { Actor, HttpAgent } from '@dfinity/agent';

let galaxyActor: any = null;

const idlFactory = ({ IDL }) => {
  const Layer = IDL.Text;
  const IPFSLink = IDL.Text;
  const Error = IDL.Text;
  const User = IDL.Principal;
  return IDL.Service({
    'createLayer': IDL.Func([Layer, IPFSLink], [Error], []),
    'resolveLink': IDL.Func([User, Layer], [IDL.Opt(IPFSLink)], ['query']),
  });
};
const init = ({ IDL }) => { return []; };

export default function useInteractWithContract() {
  const initActor = async  () => {
    // const agent = new HttpAgent();
    // galaxyActor = Actor.createActor(idlFactory, { agent, canisterId });

    galaxyActor = await window.ic.plug.createActor({
      canisterId: window.canisterId,
      interfaceFactory: idlFactory,
    });
  };

  const read = async ({ method, args }) => {
    if (!galaxyActor) {
      await initActor();
    }
    return await galaxyActor[method](...args);
  };

  const write = async ({ method, args }) => {
    debugger;
    if (!galaxyActor) {
      await initActor();
    }
    return await galaxyActor[method](...args);
  };

  return { read, write };
}
