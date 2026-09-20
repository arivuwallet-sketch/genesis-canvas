import type { DialogueLine, DialogueTree } from "./MacroTypes";

export interface LoreEvent {
  id: string;
  timestamp: number;
  tags: string[];
  summary: string;
}

export class DialogueLoreMatrix {
  private readonly events: LoreEvent[] = [];

  record(event: LoreEvent) {
    this.events.push(event);
    if (this.events.length > 256) this.events.shift();
  }

  buildContextTags(extraTags: string[] = []) {
    return Array.from(
      new Set([
        ...extraTags,
        ...this.events.flatMap((event) => event.tags),
      ]),
    ).slice(-32);
  }

  generateTemplateTree(
    npcId: string,
    treeId: string,
    speaker: string,
    currentContext: string,
  ): DialogueTree {
    const relevant = this.events
      .filter((event) => event.summary.toLowerCase().includes(currentContext.toLowerCase()) || event.tags.includes(currentContext))
      .slice(-6);

    const referenced = relevant.map((event) => event.id);
    const lines: DialogueLine[] = [
      {
        speaker,
        text: relevant.length
          ? `I heard about ${relevant[relevant.length - 1]!.summary}.`
          : `Tell me what happened at ${currentContext}.`,
      },
      ...relevant.map((event) => ({
        speaker,
        text: event.summary,
      })),
    ];

    return {
      treeId,
      npcId,
      contextTags: this.buildContextTags([currentContext]),
      eventsReferenced: referenced,
      lines,
    };
  }

  getRecentEvents() {
    return [...this.events].slice(-12);
  }
}
