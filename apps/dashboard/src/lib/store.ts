import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'intents-store.json');

export function getIntents() {
    if (!fs.existsSync(STORE_PATH)) {
        return {};
    }
    const data = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(data);
}

export function saveIntent(intentId: string, intent: any) {
    const intents = getIntents();
    intents[intentId] = intent;
    fs.writeFileSync(STORE_PATH, JSON.stringify(intents, null, 2));
}

export function getIntent(intentId: string) {
    const intents = getIntents();
    return intents[intentId];
}
