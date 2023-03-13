import {Whiteboard, WhiteboardObjectSnapshot} from "../fabric/Whiteboard";
import {Doc} from "yjs";

export class WhiteboardBinding {
    constructor(whiteboard: Whiteboard, private doc: Doc) {
        const objectsCrdt = doc.getMap("objects");

        objectsCrdt.observe((event) => {
            if (event.transaction.origin === whiteboard) {
                return;
            }

            Array.from(event.changes.keys).forEach(([id, { action, oldValue }]) => {
                if (action === "add") {
                    const newObj = objectsCrdt.get(id) as WhiteboardObjectSnapshot;
                    whiteboard.addObject(newObj);
                }

                if (action === "delete") {
                    whiteboard.removeObject(id);
                }

                if (action === "update") {
                    const newObj = objectsCrdt.get(id) as WhiteboardObjectSnapshot;

                    const update = Object.fromEntries(
                        Object.entries(newObj).filter(([key, value]) => oldValue[key] !== value || key === "data")
                    );

                    // @ts-ignore
                    whiteboard.updateObject(update);
                }
            });
        });

        whiteboard.subscribe((state) => {
            doc.transact(() => {
                if (state.data.deleted) {
                    objectsCrdt.delete(state.data.id);
                } else {
                    objectsCrdt.set(state.data.id, state);
                }
            }, whiteboard);
        });
    }
}