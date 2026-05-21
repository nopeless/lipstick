export interface LipstickConfig {
  prefix: string;
}

export const config: LipstickConfig = {
  prefix: "lipstick-",
};

export function defineConfigLipstick(next: Partial<LipstickConfig>): void {
  if (typeof next.prefix === "string") {
    config.prefix = next.prefix;
  }
}
