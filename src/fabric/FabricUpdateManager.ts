import {ICollabUpdateManager} from "../ICollabUpdateManager";
import {Whiteboard, WhiteboardObjectSnapshot} from "./Whiteboard";


export type FabricUpdate = WhiteboardObjectSnapshot[];

export class FabricUpdateManager implements ICollabUpdateManager<FabricUpdate>{
    private stateSnapshot = new Map<string, WhiteboardObjectSnapshot>();

    private subscribersReceivedUpdates: Array<(state: FabricUpdate) => void> = [];

    private subscribersCreatedUpdates: Array<(state: FabricUpdate) => void> = [];

    constructor(private whiteboard: Whiteboard) {
        this.stateSnapshot = whiteboard.getObjectsSnapshot().reduce((stateMap, obj) => {
            stateMap.set(obj.data.id, obj);
            return stateMap;
        }, new Map<string, WhiteboardObjectSnapshot>());

        this.whiteboard.subscribe((obj) => {
            this.createUpdate(obj);
        })
    }

    createFullStateUpdate(): FabricUpdate {
        return Array.from(this.stateSnapshot.values());
    }

    clearState() {
        this.stateSnapshot = new Map<string, WhiteboardObjectSnapshot>();
        this.whiteboard.clear();
    }

    applyUpdate(update: FabricUpdate) {
        update.forEach((newObj) => {
            const old = this.stateSnapshot.get(newObj.data.id!);

            if (!old) {
                this.stateSnapshot.set(newObj.data.id, newObj);
                this.whiteboard.updateObjects([newObj]);
            } else if (
                newObj.data.version > old.data.version
                // conflict
                || (newObj.data.version === old.data.version && newObj.data.versionNonce < old.data.versionNonce)
            ) {
                this.stateSnapshot.set(newObj.data.id, newObj);
                this.whiteboard.updateObjects([newObj])
            }
        });

        this.subscribersReceivedUpdates.forEach((handler) => {
            handler(this.createFullStateUpdate());
        })
    }

    createUpdate(obj: WhiteboardObjectSnapshot) {
        const prev = this.stateSnapshot.get(obj.data.id);

        if (prev) {
            const { data: newObjData, ...newObjState } = obj;
            const { data: prevObjData, ...prevObjState } = prev;

            if (JSON.stringify(newObjState) === JSON.stringify(prevObjState) && newObjData.deleted === prevObjData.deleted) {
                return;
            }
        }

        this.stateSnapshot.set(obj.data.id, obj);

        this.subscribersCreatedUpdates.forEach((handler) => {
            handler([obj]);
        })
    }

    subscribeReceivedUpdates(handler: (state: FabricUpdate) => void) {
        this.subscribersReceivedUpdates.push(handler);
    }

    subscribeCreatedUpdates(handler: (state: FabricUpdate) => void) {
        this.subscribersCreatedUpdates.push(handler);
    }
}