import {fabric} from "fabric";
import {v4 as uuidv4} from "uuid";
import {Arrow} from "./Arrow";

export interface Options {
    strokeColor: string,
    fillColor: string,
    strokeWidth: number
}

enum Tool {
    Rect = 'Rect',
    Text = 'Text',
    Arrow = 'Arrow',
    Pen = 'Pen',
};

export type WhiteboardObjectSnapshot = {
    type: string,
    data: {
        id: string,
        versionNonce: string,
        version: number,
        deleted: boolean
    }
} & Record<string, any>;

const createObjectFromWhiteboardObject = (json: WhiteboardObjectSnapshot): fabric.Object => {
    let newObj: fabric.Object

     fabric.util.enlivenObjects([json], ([obj]: fabric.Object[]) => {
         newObj = obj;
     }, "", () => {});

    // @ts-ignore
    newObj.data = json.data;

    // @ts-ignore
    return newObj;
}

// @ts-ignore
const createWhiteboardObjectFromObject = (obj: fabric.Object): WhiteboardObjectSnapshot => obj.toJSON(["data"]);


export class Whiteboard {
    private fcanvas: fabric.Canvas;
    private canvas: HTMLCanvasElement;
    private currentTool: Tool | null = null;

    private subscribers: Array<(object: WhiteboardObjectSnapshot) => void> = [];

    constructor(canvasContainer: HTMLDivElement, private options: Options) {
        this.canvas = document.createElement("canvas");
        canvasContainer.append(this.canvas);

        this.fcanvas = new fabric.Canvas(this.canvas, {
            width: canvasContainer.clientWidth,
            height: canvasContainer.clientHeight
        });

        window.addEventListener("resize", () => {
            this.fcanvas.setWidth(canvasContainer.clientWidth);
            this.fcanvas.setHeight(canvasContainer.clientHeight);
            this.fcanvas.calcOffset();
        });

        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerStyle = 'circle';
        fabric.Object.prototype.borderColor = '#1F87EF';
        fabric.Object.prototype.cornerColor = '#1F87EF';
        fabric.Object.prototype.cornerSize = 6;
        fabric.Object.prototype.padding = 10;
        fabric.Object.prototype.selectable = false;
        fabric.Object.prototype.hoverCursor = "auto";
        fabric.Object.prototype.perPixelTargetFind = true;
        fabric.Object.prototype.strokeUniform = true;
        fabric.Object.prototype.noScaleCache = false;
        fabric.Object.prototype.objectCaching = false;

        this.setOptions(this.options);

        this.fcanvas.on("object:added", ({target}) => this.handleObjectUpdated(target!));

        this.fcanvas.on("object:modified", ({target}) => this.handleObjectUpdated(target!));

        this.fcanvas.on("object:resizing", ({target}) => this.handleObjectUpdated(target!));

        this.fcanvas.on("object:rotating", ({target}) => this.handleObjectUpdated(target!));

        this.fcanvas.on("object:scaling", ({target}) => this.handleObjectUpdated(target!));

        this.fcanvas.on("object:removed", ({target}) => this.handleObjectUpdated(target!, true));

        this.fcanvas.on("object:moving", ({target}) => this.handleObjectUpdated(target!));

        this.fcanvas.on("text:changed", ({target}) => this.handleObjectUpdated(target!));

        this.fcanvas.on("selection:created", () => {
            this.fcanvas.getObjects().map((item) => {
                if (!(item instanceof fabric.Textbox)) {
                    item.set({perPixelTargetFind: true});
                }
            });
            this.fcanvas.getActiveObjects().map((item) => item.set({perPixelTargetFind: false}));
        });

        this.fcanvas.on("selection:cleared", () => {
            this.fcanvas.getObjects().map((item) => {
                if (!(item instanceof fabric.Textbox)) {
                    item.set({perPixelTargetFind: true});
                }
            });
        });

        this.fcanvas.on("selection:updated", () => {
            this.fcanvas.getObjects().map((item) => {
                if (!(item instanceof fabric.Textbox)) {
                    item.set({perPixelTargetFind: true});
                }
            });
            this.fcanvas.getActiveObjects().map((item) => item.set({perPixelTargetFind: false}));
        });

        console.log(this.fcanvas);
    }

    private handleObjectUpdated(obj: fabric.Object, deleted: boolean = false) {
        if (!obj.data?.id) {
            obj.data = {
                id: uuidv4(),
                versionNonce: uuidv4(),
                version: 0,
                deleted: false
            }
        } else {
            obj.data!.versionNonce = uuidv4();
            obj.data!.version++;
        }

        if (deleted) {
            obj.data.deleted = true;
        }

        this.subscribers.forEach(handler => handler(createWhiteboardObjectFromObject(obj)));
    }

    subscribe(handler: (state: WhiteboardObjectSnapshot) => void) {
        this.subscribers.push(handler);
    }

    setOptions(options: Partial<Options>) {
        this.options = {
            ...this.options,
            ...options
        };

        this.fcanvas.freeDrawingBrush.color = this.options.strokeColor;
        this.fcanvas.freeDrawingBrush.width = this.options.strokeWidth;
    }

    getObjectsSnapshot(): WhiteboardObjectSnapshot[] {
        return this.fcanvas.getObjects().map(createWhiteboardObjectFromObject);
    }

    addObject(obj: WhiteboardObjectSnapshot) {
        const newFobj = createObjectFromWhiteboardObject(obj);
        this.fcanvas.add(newFobj);
        newFobj.setCoords();
        newFobj.selectable = true;
        this.fcanvas.renderAll();
    }

    updateObject(newObjState: WhiteboardObjectSnapshot) {
        function update(parent: fabric.ICollection<any>, newObjState: WhiteboardObjectSnapshot) {
            const original = parent.getObjects().find(o => o.data.id === newObjState.data.id)!;

            if (!original) {
                return;
            }

            const {type, ...otherProps} = newObjState;
            original.set(otherProps);

            if (type === "group") {
                const groupObject = original as fabric.Group;

                newObjState.objects.forEach((newGroupObject: WhiteboardObjectSnapshot) => {
                    update(groupObject, newGroupObject);
                })

                groupObject.addWithUpdate();
            }

            original.setCoords();
        }

        update(this.fcanvas, newObjState);

        this.fcanvas.renderAll();
    }

    removeObject(id: string) {
        const original = this.fcanvas.getObjects().find(o => o.data.id === id)!;
        this.fcanvas.remove(original);
    }

    updateObjects(objects: WhiteboardObjectSnapshot[]): void {
        const map = this.fcanvas
            .getObjects()
            .reduce(
                (map, obj) => map.set(obj.data.id, obj),
                new Map<string, fabric.Object>()
            )

        objects.forEach((obj) => {
            const fobj = map.get(obj.data.id);

            if (!fobj) {
                if (obj.data.deleted) return;

                const newFobj = createObjectFromWhiteboardObject(obj);
                this.fcanvas.add(newFobj);
                newFobj.setCoords();
                newFobj.selectable = true;
                this.fcanvas.renderAll();
            } else if (obj.data.deleted && !fobj.data.deleted) {
                this.fcanvas.remove(fobj);
            } else {
                fobj.set(obj);
                fobj.setCoords();
                this.fcanvas.renderAll();
            }
        })
    }

    removeCanvasListener() {
        this.fcanvas.off('mouse:down');
        this.fcanvas.off('mouse:move');
        this.fcanvas.off('mouse:up');
    }

    resetTool() {
        this.currentTool = null;
        this.fcanvas.isDrawingMode = false;
        this.fcanvas.defaultCursor = "default";
        this.removeCanvasListener();
        this.fcanvas.getObjects().map((item) => item.set({selectable: false, hoverCursor: "auto"}));
        this.fcanvas.discardActiveObject().renderAll();
    }

    removeSelected() {
        this.fcanvas.getActiveObjects().forEach((obj) => {
            this.fcanvas.remove(obj)
        });
        this.fcanvas.discardActiveObject().renderAll()
    }

    clear() {
        this.fcanvas.clear();
    }

    usePen() {
        this.currentTool = Tool.Pen;
        this.fcanvas.isDrawingMode = true;
    }

    useSelect() {
        this.resetTool();
        this.fcanvas.getObjects().map((item) => item.set({selectable: true, hoverCursor: "move"}));
    }

    useRect() {
        if (this.currentTool === Tool.Rect) {
            return;
        }
        this.resetTool();

        this.fcanvas.defaultCursor = "crosshair";
        this.fcanvas.getObjects().map((item) => item.set({hoverCursor: "crosshair"}));

        this.currentTool = Tool.Rect;

        let rect: fabric.Rect;

        this.fcanvas.on('mouse:down', (e) => {
            const {x: startX, y: startY} = this.fcanvas.getPointer(e.e);

            rect = new fabric.Rect({
                stroke: this.options.strokeColor,
                strokeWidth: this.options.strokeWidth,
                fill: this.options.fillColor,
                left: startX,
                top: startY,
                width: 0,
                height: 0,
            });

            this.fcanvas.add(rect);

            this.fcanvas.on('mouse:move', (e) => {
                const {x, y} = this.fcanvas.getPointer(e.e);

                if (x < startX) {
                    rect.set('left', x);
                }
                if (y < startY) {
                    rect.set('top', y);
                }
                rect.set({
                    width: Math.abs(x - startX),
                    height: Math.abs(y - startY),
                });
                rect.setCoords();
                this.handleObjectUpdated(rect);
                this.fcanvas.renderAll();
            });

            this.fcanvas.on('mouse:up', () => {
                this.useSelect();
                this.fcanvas.setActiveObject(rect);
                this.fcanvas.renderAll();
            });
        });
    }

    useText() {
        if (this.currentTool === Tool.Text) {
            return;
        }
        this.resetTool();

        this.fcanvas.defaultCursor = "text";
        this.fcanvas.getObjects().map((item) => item.set({hoverCursor: "text"}));
        this.fcanvas.discardActiveObject().renderAll();

        this.currentTool = Tool.Text;

        this.fcanvas.on("mouse:down", (e) => {
            const {x: startX, y: startY} = this.fcanvas.getPointer(e.e);

            const text = new fabric.Textbox("", {
                strokeWidth: 2,
                fill: this.options.strokeColor,
                left: startX,
                top: startY,
                fontFamily: "sans-serif",
                perPixelTargetFind: false
            });

            this.fcanvas.add(text);
            this.useSelect();
            this.fcanvas.setActiveObject(text);
            text.enterEditing();
            this.fcanvas.renderAll();
        })
    }

    useArrow() {
        if (this.currentTool === Tool.Arrow) {
            return;
        }
        this.resetTool();

        this.fcanvas.defaultCursor = "crosshair";
        this.fcanvas.getObjects().map((item) => item.set({hoverCursor: "crosshair"}));

        this.currentTool = Tool.Arrow;


        let arrow: fabric.Object;

        this.fcanvas.on('mouse:down', (e) => {
            const {x: startX, y: startY} = this.fcanvas.getPointer(e.e);

            arrow = new Arrow([startX, startY, startX, startY], {
                strokeWidth: 6,
                stroke: this.options.strokeColor
            });

            this.fcanvas.add(arrow);

            this.fcanvas.on('mouse:move', (e) => {
                const {x, y} = this.fcanvas.getPointer(e.e);

                // @ts-ignore
                arrow.set({ x2: x, y2: y });
                arrow.setCoords();

                this.handleObjectUpdated(arrow);
                this.fcanvas.renderAll();
            });

            this.fcanvas.on('mouse:up', () => {
                this.useSelect();
                this.fcanvas.setActiveObject(arrow);
                this.fcanvas.renderAll();
            });
        });
    }
}