import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChainService } from "src/chain/chain.service";

@WebSocketGateway({
    cors: {
        origin: '*',
    }
})
export class ChainGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private connectedNodes: Set<string> = new Set();

    constructor(
        private readonly chain: ChainService,
    ) { }

    handleConnection(client: Socket) {
        const nodeId = client.id;
        this.connectedNodes.add(nodeId);
        console.log(`Node connected: ${nodeId}`);
    }

    handleDisconnect(client: Socket) {
        const nodeId = client.id;
        this.connectedNodes.delete(nodeId);
        console.log(`Node disconnected: ${nodeId}`);
    }

    @SubscribeMessage('sync_blockchain')
    async handleBlockchainSync(client: Socket, payload: any) {
        try {
            const syncResult = await this.chain.synchronizeChain(payload.chain, payload.accountHash);

            if (syncResult.success) {
                this.server.emit('blockchain_synced', {
                    status: 'success',
                    message: syncResult.message
                });
            }
        } catch (error) {
            client.emit('sync_error', {
                error: error.message
            });
        }
    }

    @SubscribeMessage('create_block')
    async handleBlockCreation(client: Socket, blockData: any) {
        try {
            const blockResult = await this.chain.createBlock(blockData);

            if (blockResult.success) {
                // Broadcast nuevo bloque a todos los nodos
                this.server.emit('new_block', blockResult.data);
            }
        } catch (error) {
            client.emit('block_creation_error', {
                error: error.message
            });
        }
    }

    // Método para difundir la cadena actual a todos los nodos
    broadcastCurrentChain() {
        this.server.emit('current_blockchain', this.chain.chain);
    }
}