import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant md58df88b test", function () {
    it("should emit Liquidated event when logLiquidated is called by approved logger", async function () {
        const [owner, logger] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("DepositLog");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Approve logger
        await instance.connect(owner).setApprovedLogger(logger.address, true);

        // Call logLiquidated and capture the transaction
        const tx = await instance.connect(logger).logLiquidated();
        const receipt = await tx.wait();

        // Verify that the Liquidated event was emitted with correct parameters
        await expect(tx)
            .to.emit(instance, "Liquidated")
            .withArgs(logger.address, await ethers.provider.getBlock(receipt.blockNumber).then(b => b.timestamp));
    });
});