import {WhiteBoardUpdate} from "./types";
import {ICollabUpdateManager} from "../ICollabUpdateManager";
import {ExcalidrawElement} from "@excalidraw/excalidraw/types/element/types";

export class ExcalidrawUpdateManager implements ICollabUpdateManager<WhiteBoardUpdate>{
    private state = new Map<string, ExcalidrawElement>();

    private prevStateSnapshot = new Map<string, ExcalidrawElement>();

    private subscribersReceivedUpdates: Array<(state: WhiteBoardUpdate) => void> = [];

    private subscribersCreatedUpdates: Array<(state: WhiteBoardUpdate) => void> = [];

    constructor(initialState: WhiteBoardUpdate) {
        this.setState(initialState);
        this.saveSnapshot();
    }

    createFullStateUpdate() {
        return Array.from(this.state.values());
    }

    applyUpdate(update: WhiteBoardUpdate) {
        update.forEach((newElement) => {
            const prevElement = this.state.get(newElement.id);

            if (!prevElement) {
                this.state.set(newElement.id, newElement);
                return;
            }

            if (
                newElement.version > prevElement.version
                // conflict
                || (newElement.version === prevElement.version && newElement.versionNonce < newElement.versionNonce)
            ) {
                this.state.set(newElement.id, newElement);
            }
        });

        this.saveSnapshot();

        this.subscribersReceivedUpdates.forEach((handler) => {
            handler(this.createFullStateUpdate());
        })
    }

    createUpdate(newState: WhiteBoardUpdate) {
        const update = newState.filter(newElement => {
            const prevElement = this.prevStateSnapshot.get(newElement.id);

            if (!prevElement || newElement.versionNonce !== prevElement.versionNonce) {
                return true;
            }

            return false;
        })

        this.setState(newState);
        this.saveSnapshot();

        if (update.length === 0) {
            return null;
        }

        this.subscribersCreatedUpdates.forEach((handler) => {
            handler(update);
        });
    }

    subscribeReceivedUpdates(handler: (state: WhiteBoardUpdate) => void) {
        this.subscribersReceivedUpdates.push(handler);
    }

    subscribeCreatedUpdates(handler: (state: WhiteBoardUpdate) => void) {
        this.subscribersCreatedUpdates.push(handler);
    }

    private setState(state: WhiteBoardUpdate) {
        this.state = state.reduce((stateMap, element) => {
            stateMap.set(element.id, element);
            return stateMap;
        }, new Map<string, ExcalidrawElement>());
    }

    private saveSnapshot() {
        this.prevStateSnapshot = structuredClone(this.state);
    }
}