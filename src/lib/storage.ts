import { defaultState, type PetState } from "@/types/pet";

const KEY = "sppet.web.v1";

export function loadState(): PetState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PetState>;
    return {
      ...defaultState(),
      ...parsed,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      gallery: Array.isArray(parsed.gallery) ? parsed.gallery : [],
      phoneTasks: Array.isArray(parsed.phoneTasks) ? parsed.phoneTasks : [],
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: PetState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
