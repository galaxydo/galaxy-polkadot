import { getArrowLabel } from "../utils";


export default function(excalidrawRef, selectedMacros) {

	async function onMacrosInvoked(macroName: string) {
		const ea = excalidrawRef?.current;
		if (!ea) return;

		const m = selectedMacros?.get(macroName);
		if (!m) return;

		const updateOutputText = (outputEl, text: string) => {
			console.log('!', 'updateOutputText', outputEl.id, text);
			ea.updateScene({
				elements: ea.getSceneElements().map(it => {
					if (it.id === outputEl.id) {
						return {
							...it,
							'originalText': text,
							'rawText': text,
							'text': text,
							'version': it.version + 1,
						};
					}
					return it;
				})
			});
		};

		const elementMap = Object.fromEntries(ea.getSceneElements().map(e => [e.id, e]));

		for (const it of m) {
			const inputEl = elementMap[it.inputFrom]; // ea.getSceneElements().find(jt => jt.id === it.inputFrom);
			if (!inputEl) throw 'no input element';

			let outputEl = elementMap[it.outputTo]; // ea.getSceneElements().find(jt => jt.id === it.outputTo);
			if (!outputEl) throw 'no output element';
			console.log('!', 'outputEl', JSON.stringify(outputEl));

			try {
				// const label = getArrowLabel(elementMap[it.arrow], elementMap);
				let updatedEl = '';
				try {
					updatedEl = await window.ga.executeMacro(macroName, inputEl, outputEl);
				} catch (err) {
					ea.setToast({
						message: `Something went wrong.. ${err.toString()}`,
					})
					updatedEl = `${err.toString()}`;
				}
				if (typeof updatedEl == 'number') {
					updatedEl = `${updatedEl}`;
				}
				console.log('!', 'updatedEl', updatedEl)
				console.log('!', 'els-before', JSON.stringify(ea.getSceneElements().map(it => it.id)));
				const elements =
					ea.getSceneElements().map(it => {
						if (it.id === outputEl.id) {
							console.log('!', 'update-from', JSON.stringify(it));
							if (updatedEl instanceof Array) {
								if (it.type == 'frame') {
									// insert new elements into the frame
									const newFrame = updatedEl.find(jt => jt.id == outputEl.id);
									if (!newFrame) throw 'should return elements with frame';
									it = [{
										...outputEl,
										...newFrame,
									}, ...updatedEl.filter(jt => jt.id != newFrame.id).map(jt => ({
										...jt,
										frameId: outputEl.id, // assign to frame
									}))]
								} else if (it.type == 'rectangle') {
									it = [
										...updatedEl,
									]

									// const groupId = updatedEl.find(jt => jt.id == it.id)?.groupIds[0];
									// it = [...updatedEl.filter(jt => jt.groupIds[0] == groupId)];
								} else if (it.type == 'text') {
									it = [
										...updatedEl,
									]
								}
							} else if (typeof updatedEl == 'object') {
								it = {
									...it,
									...updatedEl,
									'version': it.version + 1,
								}
							} else if (typeof updatedEl == 'string') {
								if (it.type == 'frame') {
									it = {
										...it,
										name: updatedEl,
										'version': it.version + 1,
									}
								} else if (it.type == 'text') {
									// width should remain the same
									// font can be downsized to fit in min(120, max(lines)) symbols in width
									const ansit = window.convertToExcalidrawElements([{
										// ...it,
										type: 'text',
										text: 'x',
										fontSize: it.fontSize,
									}])[0].width; // width per symbol - does not matter, symbols of same font have different width
									const pansit = ansit / it.fontSize; // ansit = pansit * it.fontSize
									const ensit = it.width;
									const linsit = updatedEl.split('\n');
									const unsit = Math.max(...linsit.map(punsit => punsit.length));
									// const onsit = unsit * ansit; // should be less than ensit;
									const newFontSize = ensit / unsit / pansit;
									const lineHeight = 1.25;
									const sekit = window.convertToExcalidrawElements([{
										// ...it,
										text: updatedEl,
										// originalText: updatedEl,
										fontSize: newFontSize,
										width: it.width, // remains the same
										height: linsit.length * newFontSize * lineHeight,
										x: it.x,
										y: it.y,
										id: it.id,
										type: 'text',
									}])[0];
									it = {
										...sekit,
										width: it.width,
										groupIds: it.groupIds,
										id: it.id,
									}
								} else if (it.type == 'embeddable') {
									it = {
										...it,
										link: `${updatedEl}`,
									}
								}
							}
							console.log('!', 'update-to', JSON.stringify(it));
						}

						return it;
					}).reduce((prev, curr) => {
						if (curr instanceof Array) {
							return [...prev, ...curr];
						}
						return [...prev, curr];
					}, []);
				ea.updateScene({
					elements: elements
				});
				console.log('!', 'els-after', JSON.stringify(ea.getSceneElements().map(it => it.id)));
			} catch (err) {
				console.error('!', 'App macro error', macroName, err.toString());
				ea.setToast({
					message: `Oops.. ${err.toString()}`,
				})
				window.showNotification({
					type: 'error',
					message: err.toString(),
				})
			}
		}
	}

	return { onMacrosInvoked }
}
