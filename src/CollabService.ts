import {DataConnection, Peer} from "peerjs";
import {ICollabUpdateManager} from "./ICollabUpdateManager";

type Command<Update> = {
    command: "hello",
    myNameIs: string;
} | {
    command: "sync",
    peersInARoom: string[],
    data: Update | undefined
} | {
    command: "update",
    peersInARoom: string[],
    update: Update
}

interface CollabState {
    peersInARoom: string[]
}

export class CollabService<Update> {
    private me: Peer;

    private subscribers: Array<(state: CollabState) => void> = [];

    private connections: DataConnection[] = [];

    get peersInARoom() {
        return this.connections.map(c => c.peer).concat(this.me.id);
    }

    constructor(user: string, private reconciler: ICollabUpdateManager<Update>) {
        this.me = new Peer(user);

        this.me.on("connection", (conn) => {
            this.regConnection(conn);
        });

        this.reconciler.subscribeCreatedUpdates((update) => {
            this.connections.forEach(conn => {
                conn.send({ command: "update", peersInARoom: this.peersInARoom, update });
            });
        });
    }

    connectTo(peerId: string) {
        const connection = this.me.connect(peerId);

        connection.on("open", () => {
            connection.send({ command: "hello", myNameIs: this.me.id });
        })

        this.regConnection(connection);
    }

    disconnect() {
        this.connections.forEach((c) => {
            c.close();
        });
        this.connections = [];
    }

    regConnection(connection: DataConnection) {
        connection.on("data", (com) => this.handleCommand(com as Command<Update>));
        this.connections.push(connection);

        this.subscribers.forEach((handler) => handler({
            peersInARoom: this.peersInARoom
        }));
    }

    handleCommand(command: Command<Update>) {
        console.log(command);

        if (command.command === "hello") {
            this.connections.forEach(conn => {
                conn.send({ command: "sync", peersInARoom: this.peersInARoom, data: this.reconciler.createFullStateUpdate() });
            });
        }

        if (command.command === "sync") {
            this.handleSyncPeers(command.peersInARoom);
            command.data && this.handleSyncData(command.data);
        }

        if (command.command === "update") {
            this.handleSyncPeers(command.peersInARoom);
            command.update && this.handleUpdateData(command.update);
        }
    }

    handleSyncData(data: Update) {
        this.reconciler.applyUpdate(data);
    }

    handleUpdateData(update: Update) {
        this.reconciler.applyUpdate(update);
    }

    handleSyncPeers(peersInARoom: string[]) {
        peersInARoom.forEach((peerId) => {
            if (this.peersInARoom.includes(peerId)) {
                return;
            }

            this.regConnection(this.me.connect(peerId));
        });

        this.peersInARoom.forEach((peerId) => {
            if (!peersInARoom.includes(peerId)) {
                const removingConnection = this.connections.find(c => c.peer === peerId);
                removingConnection!.close();
                this.connections = this.connections.filter(c => removingConnection !== c)
            }
        });
    }

    subscribe(handler: (state: CollabState) => void) {
        this.subscribers.push(handler);
    }
}