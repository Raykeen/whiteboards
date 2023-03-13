import {Button, Group, Input, Select} from "@skbkontur/react-ui";
import {
    ArrowARightIcon16Light,
    ArrowShapeAUpLeftIcon16Light,
    ShapeSquareIcon16Light,
    ShapeSquareIcon16Solid,
    ToolPencilIcon16Light,
    TrashCanIcon16Light
} from "@skbkontur/icons";
import React, {useEffect, useRef, useState} from "react";
import {v4 as uuidv4} from "uuid";
import styles from "./FabricApp.module.css";
import {Whiteboard} from "./Whiteboard";
import {FabricUpdate, FabricUpdateManager} from "./FabricUpdateManager";
import {CollabService} from "../CollabService";

const userId = localStorage.getItem("fabricUserId") || uuidv4();
localStorage.setItem("fabricUserId", userId);

const colors = {
    darkGray: "#3D3D3D",
    transparent: "transparent",
    blue: "#2291FF",
    red: "#F03B36",
    mint: "#00BEA2",
    purple: "#B750D1"
}

export const FabricApp = () => {
    const [peerId, setPeerId] = useState(userId);
    const canvasContainerRef = useRef<HTMLDivElement>(null)
    const wboardRef = useRef<Whiteboard | null>(null);
    const updaterRef = useRef<FabricUpdateManager | null>(null);
    const collabRef = useRef<CollabService<FabricUpdate> | null>(null);

    const connect = () => {
        wboardRef.current?.clear();
        collabRef.current?.connectTo(peerId);
    }

    useEffect(() => {
        wboardRef.current = new Whiteboard(canvasContainerRef.current!, {
            strokeWidth: 3,
            strokeColor: colors.purple,
            fillColor: colors.transparent
        });
        updaterRef.current = new FabricUpdateManager(wboardRef.current!);

        collabRef.current = new CollabService<FabricUpdate>(userId, updaterRef.current);
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
            <Input width={300} value={peerId} placeholder={"peer id"} onValueChange={setPeerId}/>
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
                    <Button onClick={() => wboardRef.current?.clear()} icon={<TrashCanIcon16Light/>}/>
                </Group></div>
        </div>
    </div>
}