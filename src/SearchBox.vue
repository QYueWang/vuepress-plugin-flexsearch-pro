<template>
  <div class="search-box">
    <input
      @input="query = $event.target.value"
      aria-label="Search"
      :value="query"
      :class="{ focused: focused }"
      :placeholder="placeholder"
      autocomplete="off"
      spellcheck="false"
      @focus="focused = true"
      @blur="focused = false"
      @keyup.enter="go(focusIndex)"
      @keyup.up="onUp"
      @keyup.down="onDown"
      ref="input"
    />
    <ul
      class="suggestions"
      v-if="showSuggestions"
      :class="{ 'align-right': alignRight }"
      @mouseleave="unfocus"
    >
      <li
        class="suggestion"
        v-for="(s, i) in suggestions"
        :key="i"
        :class="{ focused: i === focusIndex }"
        @mousedown="go(i)"
        @mouseenter="focus(i)"
      >
        <a :href="s.path" @click.prevent>
          <span
            v-html="s.title || s.path"
            class="suggestion__title"
          ></span>
          <span v-html="s.text" class="suggestion__result"></span>
        </a>
      </li>
    </ul>
  </div>
</template>

<script>
import Flexsearch from "flexsearch";
import { highlightText } from "./utils";

/* global 
SEARCH_MAX_SUGGESTIONS
SEARCH_PATHS
SEARCH_HOTKEYS
SEARCH_RESULT_LENGTH
*/

export default {
  data() {
    return {
      query: "",
      focused: false,
      focusIndex: 0,
      placeholder: undefined,
      indexCN: null,
      indexEN: null,
    };
  },

  mounted() {
    this.placeholder = this.$site.themeConfig.searchPlaceholder || "";
    document.addEventListener("keydown", this.onHotkey);

    this.setupFlexSearch();
  },

  beforeDestroy() {
    document.removeEventListener("keydown", this.onHotkey);
  },

  computed: {
    showSuggestions() {
      return this.focused && this.suggestions && this.suggestions.length;
    },

    suggestions() {
      const query = this.query.trim().toLowerCase();
      let result = null;
      if (!query) {
        return;
      }

      const regex = /[\x00-\x7F]/g;

      if (regex.test(query)) {
        result = this.indexEN.search(query).map((page) => {
          return {
            ...page,
            title: this.getSuggestionTitle(page),
            text: this.getSuggestionText(page),
          };
        });
      } else {
        result = this.indexCN.search(query).map((page) => {
          return {
            ...page,
            title: this.getSuggestionTitle(page),
            text: this.getSuggestionText(page),
          };
        });
      }

      return result;
    },

    // make suggestions align right when there are not enough items
    alignRight() {
      const navCount = (this.$site.themeConfig.nav || []).length;
      const repo = this.$site.repo ? 1 : 0;
      return navCount + repo <= 2;
    },
  },

  methods: {
    getPageLocalePath(page) {
      for (const localePath in this.$site.locales || {}) {
        if (localePath !== "/" && page.path.indexOf(localePath) === 0) {
          return localePath;
        }
      }
      return "/";
    },

    isSearchable(page) {
      let searchPaths = SEARCH_PATHS;

      // all paths searchables
      if (searchPaths === null) {
        return true;
      }

      searchPaths = Array.isArray(searchPaths)
        ? searchPaths
        : new Array(searchPaths);

      return (
        searchPaths.filter((path) => {
          return page.path.match(path);
        }).length > 0
      );
    },

    onHotkey(event) {
      if (
        event.srcElement === document.body &&
        SEARCH_HOTKEYS.includes(event.key)
      ) {
        this.$refs.input.focus();
        event.preventDefault();
      }
    },

    onUp() {
      if (this.showSuggestions) {
        if (this.focusIndex > 0) {
          this.focusIndex--;
        } else {
          this.focusIndex = this.suggestions.length - 1;
        }
      }
    },

    onDown() {
      if (this.showSuggestions) {
        if (this.focusIndex < this.suggestions.length - 1) {
          this.focusIndex++;
        } else {
          this.focusIndex = 0;
        }
      }
    },

    go(i) {
      if (!this.showSuggestions) {
        return;
      }
      const path = this.suggestions[i].path;

      if (this.$route.path !== path) {
        this.$router.push(this.suggestions[i].path);
      }

      this.query = "";
      this.focusIndex = 0;
    },

    focus(i) {
      this.focusIndex = i;
    },

    unfocus() {
      this.focusIndex = -1;
    },

    setupFlexSearch() {
      //中文搜索
      const searchCNOptions = {
        encode: "icase",
        tokenize: function (str) {
          return str.replace(/[\x00-\x7F]/g, "").split("");
        },
        resolution: 9,
        doc: {
          id: "key",
          field: ["title", "content", "headers"],
        },
      };

      //英文搜索
      const searchENOptions = {
        encode: "icase",
        tokenize: "forward",
        resolution: 9,
        doc: {
          id: "key",
          field: ["title", "content", "headers"],
        },
      };

      this.indexCN = new Flexsearch(searchCNOptions);
      this.indexEN = new Flexsearch(searchENOptions);
      const { pages } = this.$site;
      this.indexCN.add(pages);
      this.indexEN.add(pages);
    },

    getSuggestionTitle(page) {
      const title = page.title ? page.title : page.path;
      return highlightText(title, this.query);
    },

    getSuggestionText(page) {
      const content = page.content;
      const queryIndex = content
        .toLowerCase()
        .indexOf(this.query.toLowerCase());
      const queryFirstWord = this.query.split(" ")[0];
      let startIndex =
        queryIndex === -1
          ? content.toLowerCase().indexOf(queryFirstWord.toLowerCase())
          : queryIndex;
      let prefix = "";
      if (startIndex > 15) {
        startIndex -= 15;
        prefix = "... ";
      }
      const text = page.content.substr(startIndex, SEARCH_RESULT_LENGTH);
      return prefix + highlightText(text, this.query);
    },
  },
};
</script>

<style lang="stylus">
.search-box {
  display: inline-block;
  position: relative;
  margin-right: 1rem;

  input {
    cursor: text;
    width: 10rem;
    height: 2rem;
    color: lighten($textColor, 25%);
    display: inline-block;
    border: 1px solid darken($borderColor, 10%);
    border-radius: 0.4rem;
    font-size: 0.9rem;
    line-height: 2rem;
    padding: 0 0.5rem 0 2rem;
    outline: none;
    transition: all 0.2s ease;
    background: #fff url('./assets/search.svg') 0.6rem 0.5rem no-repeat;
    background-size: 1rem;

    &:focus {
      cursor: auto;
      border-color: $accentColor;
      width: 15rem;
    }
  }

  .suggestions {
    list-style-type: none;
    display: block;
    overflow: auto;
    background: white;
    width: 30rem;
    max-height: 35rem;
    position: absolute;
    top: 1.5rem;
    border: 1px solid darken($borderColor, 10%);
    padding: 0.4rem;
    border-radius: 0.3rem;

    &.align-right {
      right: 0;
    }
  }

  .suggestion {
    line-height: 1.4;
    padding: 0.6rem 1rem;
    cursor: pointer;

    a {
      white-space: normal;
      color: lighten($textColor, 35%);

      em {
        color: $accentColor;
        font-weight: bold;
        font-style: normal;
      }

      .suggestion__title {
        font-weight: 600;
        color: $textColor;
        display: block;
        padding-bottom: 0.4rem;
      }

      .suggestion__text {
        font-size: 0.9em;
      }
    }

    &.focused {
      background-color: lighten($accentColor, 93%);
    }
  }
}

@media (max-width: $MQNarrow) {
  .search-box {
    input {
      cursor: pointer;
      width: 0;
      border-color: transparent;
      position: relative;

      &:focus {
        cursor: text;
        left: 0;
        width: 10rem;
      }
    }
  }
}

// Match IE11
@media all and (-ms-high-contrast: none) {
  .search-box input {
    height: 2rem;
  }
}

@media (max-width: $MQNarrow) and (min-width: $MQMobile) {
  .search-box {
    .suggestions {
      left: 0;
    }
  }
}

@media (max-width: $MQMobile) {
  .search-box {
    margin-right: 0;

    input {
      left: 1rem;
    }

    .suggestions {
      right: 0;
    }
  }
}

@media (max-width: $MQMobileNarrow) {
  .search-box {
    .suggestions {
      width: calc(100vw - 4rem);
    }

    input:focus {
      width: 8rem;
    }
  }
}

.highlighted {
  color: $accentColor;
}
</style>
