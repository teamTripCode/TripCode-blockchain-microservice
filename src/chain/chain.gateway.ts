import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, MessageBody, SubscribeMessage } from "@nestjs/websockets";
import { forwardRef, Inject, Logger } from "@nestjs/common";
import { Block } from "handlersChain/Block";
import { ChainService } from "./chain.service";

@WebSocketGateway(8080, { cors: { origin: '*' } })
export class ChainGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private logger = new Logger('ChainGateway');
    private peers: Set<any> = new Set();

    constructor(
        @Inject(forwardRef(() => ChainService))
        private readonly chainService: ChainService
    ) { }

    handleConnection(client: any) {
        this.peers.add(client);
        this.logger.log(`Node connected: ${client.id}`);
    }

    handleDisconnect(client: any) {
        this.peers.delete(client);
        this.logger.log(`Node disconnected: ${client.id}`);
    }

    handleReceivedChain(receivedChain: Block[], accountHash: string) {
        this.chainService.synchronizeChain(receivedChain, accountHash);
    }

    // Propaga un bloque a todos los nodos conectados
    public propagateBlock(block: any) {
        this.peers.forEach(peer => {
            peer.emit('newBlock', block); // Envia el bloque a cada nodo
        });
    }

    @SubscribeMessage('newBlock')
    handleNewBlock(@MessageBody() block: any) {
        this.logger.log(`New block received: ${block.hash}`);
        this.propagateBlock(block);
    }

    @SubscribeMessage('receivedChain')
    handleReceivedChainWs(@MessageBody() data: { accountHash: string, receivedChain: Block[] }) {
        const { accountHash, receivedChain } = data;
        this.logger.log(`Received chain from: ${accountHash}`);
        this.handleReceivedChain(receivedChain, accountHash);
    }
}