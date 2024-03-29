const he = require("he");

/**
 * @param  page
 * @returns {string}
 */
module.exports.getPageText = (page) => {
  if (!page._strippedContent) {
    return "";
  }
  // _strippedContent does not contain the YAML frontmatter
  const { html } = page._context.markdown.render(page._strippedContent);

  const text = he.decode(
    // decode HTML entities like &quot;
    html
      .replace(/(<[^>]+>)+/g, " ") // remove HTML tags
      .replace(/^\s*#\s/gm, "") // remove header anchors inserted by vuepress
  );
  return text;
};

/**
 * @param  {string} fullText
 * @param  {string} highlightTarget
 * @returns {string}
 */
module.exports.highlightText = (fullText, highlightTarget) => {
  let result = fullText;
  const highlightWords = highlightTarget.split(" ").filter((word) => word.length > 0);
  if (highlightWords.length > 0) {
    for (const word of highlightWords) {
      result = result.replace(new RegExp(word, "ig"), "<em>$&</em>");
    }
  } else {
    result = fullText.replace(new RegExp(highlightTarget, "ig"), "<em>$&</em>");
  }

  return result;
};
