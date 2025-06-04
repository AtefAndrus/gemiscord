import { sanitizeMessageContent } from "../../../src/utils/sanitizer";

describe("Sanitizer", () => {
  describe("sanitizeMessage", () => {
    it("should replace user mentions with placeholder", () => {
      const input = "Hello <@123456789> how are you?";
      const result = sanitizeMessageContent(input);

      expect(result).toBe("Hello [ユーザー] how are you?");
    });

    it("should replace channel mentions with placeholder", () => {
      const input = "Check out <#987654321> channel!";
      const result = sanitizeMessageContent(input);

      expect(result).toBe("Check out [チャンネル] channel!");
    });

    it("should replace role mentions with placeholder", () => {
      const input = "Hey <@&555666777> members!";
      const result = sanitizeMessageContent(input);

      expect(result).toBe("Hey [ロール] members!");
    });

    it("should replace custom emojis with text", () => {
      const input = "Great job! <:thumbsup:123456789>";
      const result = sanitizeMessageContent(input);

      expect(result).toBe("Great job! :thumbsup:");
    });

    it("should replace animated emojis with text", () => {
      const input = "Party time! <a:parrot:987654321>";
      const result = sanitizeMessageContent(input);

      expect(result).toBe("Party time! :parrot:");
    });

    it("should replace code blocks with placeholder", () => {
      const input = 'Here is code:\n```javascript\nconsole.log("hello");\n```';
      const result = sanitizeMessageContent(input);

      expect(result).toBe("Here is code: [コードブロック]");
    });

    it("should handle multiple mentions in one message", () => {
      const input = "Hey <@123> and <@456>, check <#789> in <@&999>";
      const result = sanitizeMessageContent(input);

      expect(result).toBe(
        "Hey [ユーザー] and [ユーザー], check [チャンネル] in [ロール]"
      );
    });

    it("should handle empty string", () => {
      const result = sanitizeMessageContent("");
      expect(result).toBe("");
    });

    it("should handle message with no special content", () => {
      const input = "This is a normal message with no mentions.";
      const result = sanitizeMessageContent(input);

      expect(result).toBe("This is a normal message with no mentions.");
    });

    it("should handle complex mixed content", () => {
      const input = `Hello <@123456789>!
Check this code:
\`\`\`typescript
const x = 1;
\`\`\`
And visit <#987654321> channel with <@&555666777> role.
Nice work! <:tada:111222333>`;

      const expected = `Hello [ユーザー]! Check this code: [コードブロック] And visit [チャンネル] channel with [ロール] role. Nice work! :tada:`;

      const result = sanitizeMessageContent(input);
      expect(result).toBe(expected);
    });
  });
});
