export const config = {
    prefix: "lipstick-",
};
export function defineConfigLipstick(next) {
    if (typeof next.prefix === "string") {
        config.prefix = next.prefix;
    }
}
