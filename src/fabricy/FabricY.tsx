import {Button, Group, Input, Select} from "@skbkontur/react-ui";
import {
    ArrowARightIcon16Light,
    ArrowShapeAUpLeftIcon16Light,
    ShapeSquareIcon16Light,
    ShapeSquareIcon16Solid,
    ToolPencilIcon16Light,
    TrashCanIcon16Light,
    ArrowShapeDRadiusUpLeftIcon16Light,
    ArrowShapeDRadiusUpRightIcon16Light
} from "@skbkontur/icons";
import React, {useEffect, useRef, useState} from "react";
import styles from "../fabric/FabricApp.module.css";
import {Whiteboard} from "../fabric/Whiteboard";
import { Doc, UndoManager } from "yjs";
import { WebrtcProvider } from "y-webrtc";
import {WhiteboardBinding} from "./WhiteboardBinding";

const colors = {
    darkGray: "#3D3D3D",
    transparent: "transparent",
    blue: "#2291FF",
    red: "#F03B36",
    mint: "#00BEA2",
    purple: "#B750D1"
}

export const FabricY = () => {
    const [roomId, setRoomId] = useState("");
    const canvasContainerRef = useRef<HTMLDivElement>(null)
    const wboardRef = useRef<Whiteboard | null>(null);
    const docRef = useRef<Doc | null>(null);
    const providerRef = useRef<WebrtcProvider | null>(null);
    const undoManagerRef = useRef<UndoManager | null>(null);

    const connect = () => {
        if (providerRef.current) {
            providerRef.current.destroy()
        }

        if (!roomId) {
            return;
        }

        wboardRef.current?.clear();

        providerRef.current = new WebrtcProvider(roomId, docRef.current!, {
            signaling: ["wss://demos.yjs.dev"]
        });
    }

    useEffect(() => {
        docRef.current = new Doc();
        console.log(docRef.current);
        wboardRef.current = new Whiteboard(canvasContainerRef.current!, {
            strokeWidth: 3,
            strokeColor: colors.purple,
            fillColor: colors.transparent
        });

        undoManagerRef.current = new UndoManager(docRef.current!.getMap("objects"), {
            trackedOrigins: new Set<any>([wboardRef.current])
        });

        new WhiteboardBinding(wboardRef.current, docRef.current);
    }, []);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Delete") {
                wboardRef.current?.removeSelected();
            }
        }

        window.addEventListener("keydown", handleKey);

        return () => window.removeEventListener("keydown", handleKey);
    }, []);


    return <div>
        <div ref={canvasContainerRef} className={styles.canvasContainer}>
        </div>

        <div className={styles.toolbar}><Group>
            <Input width={100} value={roomId} placeholder={"room id"} onValueChange={setRoomId}/>
            <Button onClick={connect}>Connect</Button>
        </Group>
            <div><Button onClick={() => wboardRef.current?.useSelect()} icon={<ArrowShapeAUpLeftIcon16Light/>}/>
                {" "}
                <Group>
                    <Button onClick={() => wboardRef.current?.usePen()} icon={<ToolPencilIcon16Light/>}/>
                    <Button onClick={() => wboardRef.current?.useRect()} icon={<ShapeSquareIcon16Light/>}/>
                    <Button onClick={() => wboardRef.current?.useText()} icon={<>A</>}/>
                    <Button onClick={() => wboardRef.current?.useArrow()} icon={<ArrowARightIcon16Light/>}/>
                </Group>
                {" "}
                <Group>
                    <Select value={colors.purple} items={Object.values(colors)}
                            onValueChange={(color) => wboardRef.current?.setOptions({
                                strokeColor: color
                            })}
                            renderValue={((color) => <ShapeSquareIcon16Light color={color}></ShapeSquareIcon16Light>)}
                            renderItem={((color) => <ShapeSquareIcon16Light color={color}></ShapeSquareIcon16Light>)}/>

                    <Select value={colors.transparent} items={Object.values(colors)}
                            onValueChange={(color) => wboardRef.current?.setOptions({
                                fillColor: color
                            })}
                            renderValue={((color) => <ShapeSquareIcon16Solid color={color}></ShapeSquareIcon16Solid>)}
                            renderItem={((color) => <ShapeSquareIcon16Solid color={color}></ShapeSquareIcon16Solid>)}/>
                </Group>
                {" "}
                <Group>
                    <Button icon={<ArrowShapeDRadiusUpLeftIcon16Light />} onClick={() => undoManagerRef.current?.undo()} />
                    <Button icon={<ArrowShapeDRadiusUpRightIcon16Light />} onClick={() => undoManagerRef.current?.redo()} />
                </Group>
                {" "}
                <Group>
                    <Button onClick={() => wboardRef.current?.clear()} icon={<TrashCanIcon16Light/>}/>
                </Group></div>
        </div>
    </div>
}