// Message sanitization utilities for Gemiscord

import { MESSAGE_PROCESSING } from "./constants.js";

const { PLACEHOLDERS, PATTERNS } = MESSAGE_PROCESSING;

/**
 * Sanitizes Discord message content for safe processing
 * Replaces mentions, custom emojis, and potentially dangerous content
 */
export function sanitizeMessageContent(content: string): string {
  let sanitized = content;

  // Replace user mentions
  sanitized = sanitized.replace(PATTERNS.USER_MENTION, PLACEHOLDERS.USER);

  // Replace channel mentions
  sanitized = sanitized.replace(PATTERNS.CHANNEL_MENTION, PLACEHOLDERS.CHANNEL);

  // Replace role mentions
  sanitized = sanitized.replace(PATTERNS.ROLE_MENTION, PLACEHOLDERS.ROLE);

  // Replace custom emojis with their names
  sanitized = sanitized.replace(PATTERNS.CUSTOM_EMOJI, ":$1:");

  // Replace code blocks to prevent prompt injection
  sanitized = sanitized.replace(PATTERNS.CODE_BLOCK, PLACEHOLDERS.CODE_BLOCK);

  // Trim excessive whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

/**
 * Extracts mentions from message content
 */
export function extractMentions(content: string): {
  users: string[];
  channels: string[];
  roles: string[];
} {
  const users: string[] = [];
  const channels: string[] = [];
  const roles: string[] = [];

  // Extract user mentions
  let match;
  while ((match = PATTERNS.USER_MENTION.exec(content)) !== null) {
    if (match[1]) {
      users.push(match[1]);
    }
  }

  // Reset regex lastIndex
  PATTERNS.USER_MENTION.lastIndex = 0;

  // Extract channel mentions
  while ((match = PATTERNS.CHANNEL_MENTION.exec(content)) !== null) {
    if (match[1]) {
      channels.push(match[1]);
    }
  }
  PATTERNS.CHANNEL_MENTION.lastIndex = 0;

  // Extract role mentions
  while ((match = PATTERNS.ROLE_MENTION.exec(content)) !== null) {
    if (match[1]) {
      roles.push(match[1]);
    }
  }
  PATTERNS.ROLE_MENTION.lastIndex = 0;

  return {
    users: [...new Set(users)], // Remove duplicates
    channels: [...new Set(channels)],
    roles: [...new Set(roles)],
  };
}

/**
 * Sanitizes user input for configuration values
 */
export function sanitizeConfigValue(value: string): string {
  // Remove any control characters
  let sanitized = value.replace(/[\x00-\x1F\x7F]/g, "");

  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitizes search queries
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove potentially dangerous characters
  let sanitized = query
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript protocol
    .replace(/data:/gi, ""); // Remove data protocol

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Escapes markdown characters
 */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/~/g, "\\~")
    .replace(/`/g, "\\`")
    .replace(/\|/g, "\\|")
    .replace(/>/g, "\\>")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/#/g, "\\#")
    .replace(/\+/g, "\\+")
    .replace(/-/g, "\\-")
    .replace(/\./g, "\\.")
    .replace(/!/g, "\\!");
}

/**
 * Removes markdown formatting
 */
export function stripMarkdown(text: string): string {
  return (
    text
      // Remove bold
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      // Remove italic
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      // Remove strikethrough
      .replace(/~~(.*?)~~/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`(.*?)`/g, "$1")
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^---+$/gm, "")
      // Clean up extra whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Validates and sanitizes URLs
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    // Check for suspicious patterns
    if (
      parsed.hostname.includes("localhost") ||
      parsed.hostname.includes("127.0.0.1") ||
      parsed.hostname.includes("0.0.0.0") ||
      parsed.hostname.startsWith("192.168.") ||
      parsed.hostname.startsWith("10.") ||
      parsed.hostname.startsWith("172.")
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitizes file names
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, "").replace(/[\/\\]/g, "");

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, "");

  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.substring(sanitized.lastIndexOf("."));
    const baseName = sanitized.substring(0, sanitized.lastIndexOf("."));
    sanitized = baseName.substring(0, 255 - extension.length) + extension;
  }

  return sanitized || "unnamed";
}

/**
 * Checks if content contains potential prompt injection
 */
export function detectPromptInjection(content: string): boolean {
  const suspiciousPatterns = [
    /ignore\s+previous\s+instructions/i,
    /disregard\s+all\s+prior/i,
    /forget\s+everything/i,
    /new\s+instructions:/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(content));
}

/**
 * Truncates text to a maximum length while preserving word boundaries
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = "..."
): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncateLength = maxLength - suffix.length;
  let truncated = text.substring(0, truncateLength);

  // Try to break at a word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > truncateLength * 0.8) {
    truncated = truncated.substring(0, lastSpace);
  }

  return truncated + suffix;
}

/**
 * Sanitizes JSON for safe parsing
 */
export function sanitizeJson(jsonString: string): string {
  // Remove BOM if present
  if (jsonString.charCodeAt(0) === 0xfeff) {
    jsonString = jsonString.slice(1);
  }

  // Remove any null bytes
  jsonString = jsonString.replace(/\0/g, "");

  // Trim whitespace
  jsonString = jsonString.trim();

  return jsonString;
}

/**
 * Creates a safe preview of potentially long text
 */
export function createSafePreview(
  text: string,
  maxLength: number = 100
): string {
  // Sanitize first
  const sanitized = sanitizeMessageContent(text);

  // Strip markdown
  const stripped = stripMarkdown(sanitized);

  // Truncate
  return truncateText(stripped, maxLength);
}
