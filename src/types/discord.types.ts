// Discord-related type extensions and custom types
import {
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  Collection,
  GuildMember,
  Message,
  SlashCommandBuilder,
  User,
} from "discord.js";

// Extended Discord client with custom properties
export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  // Make client.user non-nullable after ready event
  user: Client["user"] & User;
}

// Slash command structure
export interface Command {
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Message processing context
export interface MessageContext {
  originalMessage: Message;
  sanitizedContent: string;
  isMentioned: boolean;
  isAutoResponse: boolean;
  guildId: string;
  channelId: string;
  userId: string;
  userDisplayName: string;
  attachments: ProcessedAttachment[];
  referencedMessage?: ReferencedMessageContext;
}

export interface ProcessedAttachment {
  id: string;
  name: string;
  size: number;
  url: string;
  contentType?: string;
  isImage: boolean;
  isSupportedByGemini: boolean;
}

export interface ReferencedMessageContext {
  content: string;
  author: string;
  timestamp: Date;
}

// Discord event handler types
export interface EventHandler<T = any> {
  name: string;
  once?: boolean;
  execute: (client: ExtendedClient, ...args: T[]) => Promise<void> | void;
}

// Ready event specific data
export interface ReadyData {
  user: User;
  guilds: number;
  timestamp: Date;
}

// Interaction handling
export interface InteractionContext {
  interaction: ChatInputCommandInteraction;
  guildId: string;
  channelId: string;
  userId: string;
  member: GuildMember;
}

// Command options
export interface StatusCommandOptions {
  verbose?: boolean;
}

export interface ConfigCommandOptions {
  action: "get" | "set" | "list";
  key?: string;
  value?: string;
}

export interface SearchCommandOptions {
  query: string;
  region?: "JP" | "US" | "global";
}

export interface ModelCommandOptions {
  model?: string;
}

// Response formatting
export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

// Bot permissions
export const REQUIRED_PERMISSIONS = {
  SendMessages: "SendMessages",
  ReadMessageHistory: "ReadMessageHistory",
  MentionEveryone: "MentionEveryone",
  EmbedLinks: "EmbedLinks",
  AttachFiles: "AttachFiles",
  UseExternalEmojis: "UseExternalEmojis",
  AddReactions: "AddReactions",
} as const;

// Discord limits
export const DISCORD_LIMITS = {
  MESSAGE_LENGTH: 2000,
  EMBED_TITLE_LENGTH: 256,
  EMBED_DESCRIPTION_LENGTH: 4096,
  EMBED_FIELD_NAME_LENGTH: 256,
  EMBED_FIELD_VALUE_LENGTH: 1024,
  EMBED_FIELDS_COUNT: 25,
  EMBED_TOTAL_LENGTH: 6000,
  FILE_SIZE_LIMIT: 25 * 1024 * 1024, // 25MB
} as const;

// Message types
export type MessageType = "mention" | "auto_response" | "slash_command";

// Channel types that bot can respond in
export const ALLOWED_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildVoice,
  ChannelType.GuildAnnouncement,
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
] as const;
