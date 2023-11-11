import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { AppState, BinaryFiles } from "@excalidraw/excalidraw/types/types";
import debounce from "lodash.debounce";
import { useState } from "react";
import { getArrowLabel } from "../utils";

const POINTER_UPDATE_TIMEOUT = 333;

export default function(
) {
	const [selectedMacros, setSelectedMacros] = useState<Map<string, SelectedMacro[]>>();

	const onPointerUpdate = debounce((elements: ExcalidrawElement[],
		appState: AppState,
		files: BinaryFiles,
	) => {
		const elIds = appState.selectedElementIds;

		if (!elIds) return;

		const selectedEls = elements.filter(it => elIds[it.id] == true);
		const newSelectedMacros = new Map<string, SelectedMacro[]>();

		// Convert the array to a map for quicker lookups
		const elementMap = Object.fromEntries(elements.map(e => [e.id, e]));

		const addMacro = (macroName, arrow, boundEl: any = null, opts = {}) => {
			if (!newSelectedMacros.has(macroName)) newSelectedMacros.set(macroName, []);

			const macroDetails = {
				'name': macroName,
				'inputFrom': arrow.startBinding?.elementId,
				'outputTo': arrow.endBinding?.elementId,
				'arrowId': arrow.id,
			};

			if (opts.caption) {
				macroDetails.caption = opts.caption;
			}

			newSelectedMacros.get(macroName).push(macroDetails);
		}

		if (selectedEls.length > 0) {
			for (const element of selectedEls) {
				// Check for arrows
				if ((element.type === 'text' || element.type == 'rectangle') && element.boundElements) {
					for (const boundEl of element.boundElements) {
						const arrow = elementMap[boundEl.id];
						if (arrow?.type === 'arrow' && arrow?.startBinding?.elementId === element.id) {
							let label = getArrowLabel(arrow, elementMap);
							let macroName = label.includes('(') ? label.substr(0, label.indexOf('(')) : label;
							if (macroName) {
								if (window.ga.getMacro(macroName)) {
									addMacro(macroName, arrow, boundEl);
								} else {
									const outputEl = elements.find(it => it.id == arrow.endBinding?.elementId);
									if (outputEl?.type == 'text') {
										if (macroName.startsWith('/')) {
											if (macroName.includes('.')) {
												addMacro('cat', arrow);
											} else {
												addMacro('ls', arrow);
											}
											// addMacro('fetch', arrow, boundEl);
										} else {
											addMacro('complete', arrow);
										}
									} else if (outputEl?.type == 'rectangle') {
										addMacro('ls', arrow);
									} else if (outputEl?.type == 'image') {
										addMacro('draw', arrow, boundEl);
									} else {
										macroName = null;
									}
									// label = `gpt4("${label}")`;
								}

							} else {
								addMacro('prompt', arrow);
							}
						}
					}
				} else if (element.type == 'image') {
					// nevermind
				}
				console.log('!', 'customData', JSON.stringify(element.customData));
				// Check for customData field with macros
				if (element.customData && element.customData.macros) {
					// Log the current element being processed
					console.log('Processing element:', element.id);

					for (const macroName in element.customData.macros) {
						console.log('!', 'macroName', macroName);

						// This condition seems redundant since we're already iterating through macroNames. Consider removing it.
						// if (!element.customData.macros[macroName]) continue;

						if (!newSelectedMacros.has(macroName)) newSelectedMacros.set(macroName, []);

						const macroDetails = {
							'name': macroName,
							'inputFrom': element.id,
							'outputTo': element.customData.outputTo || element.id,
						};

						console.log('!', 'macroDetails', JSON.stringify(macroDetails));
						newSelectedMacros.get(macroName).push(macroDetails);
					}
				}
			}
		} else {
			const anchorArrows = elements.filter(it => it.type == 'arrow' && !it.startBinding && it.boundElements);
			for (const benit of anchorArrows) {
				const fenit = benit.boundElements.map(cenit => elements.find(denit => denit.id == cenit.id)).find(cenit => cenit.type == 'text');
				if (fenit && fenit.text) {
					addMacro(
						// fenit.text,
						'jump',
						benit,
						null,
						{
							caption: fenit?.text,
						}
					)
				}
			}
		}

		console.log('!', 'newSelectedMacros', JSON.stringify([...newSelectedMacros]));

		setSelectedMacros(newSelectedMacros);
	}, POINTER_UPDATE_TIMEOUT);

	return { onPointerUpdate, selectedMacros };
}
