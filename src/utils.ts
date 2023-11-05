export const getArrowLabel = (arrow, elementMap) => {
  const first = () => {
    if (arrow.boundElements && arrow.boundElements[0]) {
      const labelElement = elementMap[arrow.boundElements[0].id];
      if (labelElement) {
        if (labelElement.text.startsWith('=')) {
          return labelElement.text.substring(1);
        } else {
          return labelElement.text;
        }
      }
    }
    return '';
  }
  let it = first();
  return it;
}

