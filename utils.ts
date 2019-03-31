import { Resolution } from "./types";

export const genResolution = (key: any): Resolution => {
    return {
        key,
        resolution: 'resolution' + key
    }
}