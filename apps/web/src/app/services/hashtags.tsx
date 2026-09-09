import React from "react";
import { extractHashtags, getHashtagCounts, addHashtagsToMockData } from "@oratio/shared/hashtags";

export { extractHashtags, getHashtagCounts, addHashtagsToMockData };

const HASHTAG_REGEX = /#(\w+)/g;

export function renderHashtags(text: string, onTagClick: (tag: string) => void): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(HASHTAG_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const tag = match[0];
    const tagName = match[1];
    parts.push(
      <button
        key={match.index}
        onClick={(e) => {
          e.stopPropagation();
          onTagClick(tagName);
        }}
        className="text-[#7c8fff] hover:text-[#a0b0ff] transition-colors cursor-pointer inline"
        style={{ background: "none", border: "none", padding: 0, fontSize: "inherit", fontFamily: "inherit" }}
      >
        {tag}
      </button>
    );
    lastIndex = match.index + tag.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}
