export type ProviderId = "openai" | "anthropic" | "azure-openai" | "mock";

export type GenerationTask = "flashcards" | "quiz" | "session_plan";

export interface AiGenerationRequest {
  task: GenerationTask;
  prompt: string;
  contextChunks: string[];
}

export interface AiGenerationResult {
  provider: ProviderId;
  model: string;
  output: string;
  latencyMs: number;
}

export interface AiProvider {
  id: ProviderId;
  generate(request: AiGenerationRequest): Promise<AiGenerationResult>;
}

class PlaceholderProvider implements AiProvider {
  constructor(public readonly id: ProviderId) {}

  async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    return {
      provider: this.id,
      model: "rhizohoro-phase1",
      output: `[placeholder:${request.task}] ${request.prompt.slice(0, 80)}`,
      latencyMs: 0,
    };
  }
}

export class AiProviderRegistry {
  private readonly providers = new Map<ProviderId, AiProvider>();

  constructor() {
    this.register(new PlaceholderProvider("mock"));
  }

  register(provider: AiProvider): void {
    this.providers.set(provider.id, provider);
  }

  resolve(providerId: ProviderId): AiProvider {
    return this.providers.get(providerId) ?? this.providers.get("mock")!;
  }
}

export const aiProviderRegistry = new AiProviderRegistry();
