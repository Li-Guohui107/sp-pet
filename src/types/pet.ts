export type Role = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

export type GalleryItem = {
  id: string;
  url: string;
  prompt: string;
  model: string;
  createdAt: number;
};

export type ImageModel = "qwen-image-2.0" | "qwen-image-2.0-pro" | "qwen-image-plus" | "qwen-image";

export type PhoneStep = {
  title: string;
  detail: string;
  kind: "open" | "tap" | "type" | "scroll" | "check" | "stop";
  text: string;
  needsConfirm: boolean;
};

export type PhonePlan =
  | { refused: true; reason: string }
  | {
      refused: false;
      app: string;
      goal: string;
      summary: string;
      steps: PhoneStep[];
    };

export type PhoneTask = {
  id: string;
  request: string;
  plan: PhonePlan;
  done: number[];
  createdAt: number;
};

export type PetState = {
  name: string;
  owner: string;
  notes: string;
  imageUrl: string;
  deepseekKey: string;
  dashscopeKey: string;
  region: "cn" | "intl";
  customBase: string;
  imageModel: ImageModel;
  messages: ChatMessage[];
  gallery: GalleryItem[];
  phoneTasks: PhoneTask[];
};

export type Health = {
  ok: boolean;
  deepseekEnv: boolean;
  dashscopeEnv: boolean;
  region: "cn" | "intl";
};

export type TabId = "chat" | "look" | "desktop" | "phone";

export type SettingsDraft = Pick<
  PetState,
  "name" | "owner" | "notes" | "deepseekKey" | "dashscopeKey" | "region" | "customBase"
>;

export const defaultState = (): PetState => ({
  name: "团子",
  owner: "主人",
  notes: "",
  imageUrl: "",
  deepseekKey: "",
  dashscopeKey: "",
  region: "cn",
  customBase: "",
  imageModel: "qwen-image-2.0",
  messages: [],
  gallery: [],
  phoneTasks: [],
});
