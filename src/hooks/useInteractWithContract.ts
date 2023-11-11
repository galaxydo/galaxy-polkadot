// import { Actor, HttpAgent } from '@dfinity/agent';

import { MIME_TYPES } from "@excalidraw/excalidraw";
import { FileId } from "@excalidraw/excalidraw/types/element/types";
import { BinaryFileData, BinaryFiles, DataURL } from "@excalidraw/excalidraw/types/types";
import {
  Asset,
  Satellite,
  User,
  deleteAsset,
  getDoc,
  listAssets,
  setDoc,
  unsafeIdentity,
  uploadBlob,
} from "@junobuild/core";
import { nanoid } from "nanoid";

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
  const initActor = async () => {
    // const agent = new HttpAgent();
    // galaxyActor = Actor.createActor(idlFactory, { agent, canisterId });

    galaxyActor = await window.ic.plug.createActor({
      canisterId: window.canisterId,
      interfaceFactory: idlFactory,
    });
  };

  const read = async ({ method, args }) => {
    const { key } = args;
    
    const satellite = {
      identity: await unsafeIdentity(),
      satelliteId: "fqotu-wqaaa-aaaal-acp3a-cai",
    };

    const doc = await getDoc<JunoScene>({
      collection: "scenes",
      key,
      satellite,
    });

    console.log('doc', doc);

    setTimeout(async () => {
      const files = await loadAssets(key);
      // window.ea.addFiles(files);      
    }, 109);
    
    return doc;
  };

  const write = async ({ method, args }) => {
    const { key, frameId } = args;

    const satellite = {
      identity: await unsafeIdentity(),
      satelliteId: "fqotu-wqaaa-aaaal-acp3a-cai",
    };

    const elements = window.ea.getSceneElements().filter(it => it.frameId == frameId).map(it => {
      return {
        ...it,
        id: null,
      }
    });

    const files =
      window.ea.getFiles();

    // const scene = {
    //   elements,
    //   files,
    // };

    const setDocRes = await setDoc<JunoScene>({
      collection: "scenes",
      doc: {
        // ...doc,
        key,
        data: {
          elements,
          // ...rest,
          // ...restMetadata,
          // lastChange,
        },
      },
      satellite,
    });

    const uploadFilesRes = await uploadFiles({
      elements,
      files,
      satellite,
      key,
    });

    return { setDocRes, uploadFilesRes }

    // if (!galaxyActor) {
    //   await initActor();
    // }
    // return await galaxyActor[method](...args);
  };

  return { read, write,  };
}

const uploadFiles = async ({
  files,
  elements,
  satellite,
  key: sceneKey,
}: {
  satellite: Satellite;
} & Pick<ExcalidrawScene, "elements" | "files"> & { key: JunoSceneKey }) => {
  if (!files) {
    return;
  }

  const { assets } = await listAssets({
    collection: "files",
    satellite,
  });

  type File = {
    key: string;
    file: BinaryFileData;
  };

  let uploadFiles: File[] = [];
  let deleteFiles: Asset[] = [];

  for (const [key, file] of Object.entries(files)) {
    const deleted =
      elements?.find(
        (element) =>
          element.type === "image" &&
          (element as ExcalidrawImageElement).fileId === key &&
          element.isDeleted,
      ) !== undefined;
    const reactivated =
      elements?.find(
        (element) =>
          element.type === "image" &&
          (element as ExcalidrawImageElement).fileId === key &&
          !element.isDeleted,
      ) !== undefined;

    const asset = assets.find(({ name }) => key === name);

    if (deleted && !reactivated && asset !== undefined) {
      deleteFiles = [...deleteFiles, asset];
    }

    if (asset === undefined && (!deleted || reactivated)) {
      uploadFiles = [...uploadFiles, { key, file }];
    }
  }

  await Promise.all([
    ...deleteFiles.map((storageFile) =>
      deleteAsset({
        collection: "files",
        fullPath: storageFile.fullPath,
        satellite,
      }),
    ),
    ...uploadFiles.map(async ({ key, file }) =>
      uploadBlob({
        collection: "files",
        filename: key,
        data: await (await fetch(file.dataURL)).blob(),
        headers: [
          ...(file.mimeType === undefined
            ? []
            : ([["Content-Type", file.mimeType]] as [string, string][])),
        ],
        token: nanoid(),
        description: sceneKey,
        satellite,
      }),
    ),
  ]);
};

export const loadAssets = async (key: string): Promise<BinaryFileData[]> => {
  const { assets } = await listAssets({
    collection: "files",
    filter: {
      matcher: {
        description: key,
      },
    },
  });

  const files = await Promise.all(
    assets.map(async ({ downloadUrl, headers, name }) => {
      const response = await fetch(
        downloadUrl.replace(".icp0.io", ".raw.icp0.io"),
      );
      const blob = await response.blob();
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const dataURL = reader?.result as string;

      const now = Date.now();

      const bnData: BinaryFileData = {
        id: name as FileId,
        dataURL: dataURL as DataURL,
        created: now,
        lastRetrieved: now,
        mimeType: (headers.find(
          ([header, _]) => header === "Content-Type'",
        )?.[1] ?? "image/jpeg") as
          | (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
          | typeof MIME_TYPES.binary,
      };

      ea.addFiles([bnData]);

      return bnData;
    }),
  );

  // return files;

  return files.reduce(
    (acc, value) => ({
      ...acc,
      [value.id]: value,
    }),
    {},
  );
};
