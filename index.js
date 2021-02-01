const { path } = require("@vuepress/shared-utils");
const { getPageText } = require("./src/utils");

const DEFAULT_SEARCH_RESULT_LENGTH = 60;

module.exports = (options) => ({
  extendPageData($page) {
    $page.content = getPageText($page);
  },
  alias: {
    "@SearchBox": path.resolve(__dirname, "src", "SearchBox.vue"),
  },
  define: {
    SEARCH_PATHS: options.searchPaths || null,
    SEARCH_HOTKEYS: options.searchHotkeys || "s",
    SEARCH_RESULT_LENGTH:
      Number(options.searchResultLength) || DEFAULT_SEARCH_RESULT_LENGTH,
  },
});
