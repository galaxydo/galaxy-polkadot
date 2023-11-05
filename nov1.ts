async function Webpage(it) {
  const els = ea.getSceneElements();

  const getFullText = (it) => {
    let fullText = ``;

    const incomingArrow = it.boundElements.find(bit => {
      if (bit.type == 'arrow') {
        const cit = els.find(cit => cit.id == bit.id);
        if (cit && cit.endBinding.elementId == it.id) {
          return true;
        }
      }
    })

    if (incomingArrow) {
      const bit = els.find(bit => bit.id == incomingArrow.id);
      const cit = els.find(cit => cit.type == 'text' && cit.id == bit.startBinding.elementId);
      if (cit) {
        fullText += getFullText(cit);
      }
    }

    fullText += it.text;

    const outgoingArrow = it.boundElements.find(bit => {
      if (bit.type == 'arrow') {
        const cit = els.find(cit => cit.id == bit.id);
        if (cit && cit.startBinding.elementId == it.id) {
          return true;
        }
      }
    });

    if (outgoingArrow) {
      const bit = els.find(bit => bit.id == outgoingArrow.id);
      if (bit && bit.type == 'arrow') {
        const cit = bit.boundElements.find(cit => cit.type == 'text');
        if (cit) {
          const dit = els.find(dit => dit.id == cit.id);
          if (dit && dit.type == 'text') {
            fullText += `${dit.text}`
          }
        }
      }
    }

    return fullText;
  }

  let url = getFullText(it);

  if (url.startsWith('https://github.com')) {
    url = url.replace('https://github.com', 'https://raw.githubusercontent.com');
  }

  const result = await fetch(url)
    .then((resp) => resp.text());

  return result;
}
