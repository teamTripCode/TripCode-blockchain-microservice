import { Module } from "@nestjs/common";
import { ChainModule } from "src/chain/chain.module";

@Module({
    imports: [ChainModule],
    providers: [ChainGatewayModule]
})
export class ChainGatewayModule { }