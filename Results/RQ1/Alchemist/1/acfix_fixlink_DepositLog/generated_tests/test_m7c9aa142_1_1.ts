import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog - kill mutant m7c9aa142", function () {
    it("should emit FraudDuringSetup with block.timestamp, not block.prevrandao", async function () {
        const [owner, logger] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("DepositLog");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Owner approves logger
        await instance.connect(owner).setApprovedLogger(logger.address, true);

        // Capture block timestamp before calling
        const blockBefore = await ethers.provider.getBlock("latest");
        const timestampBefore = blockBefore!.timestamp;

        // Call logFraudDuringSetup from approved logger
        const tx = await instance.connect(logger).logFraudDuringSetup();
        const receipt = await tx.wait();

        // Get the event
        const event = receipt!.logs.find(
            (log: any) => log.topics[0] === ethers.id("FraudDuringSetup(address,uint256)")
        );
        expect(event).to.not.be.undefined;

        // Decode the event
        const iface = new ethers.Interface([
            "event FraudDuringSetup(address indexed _depositContractAddress, uint256 _timestamp)"
        ]);
        const decoded = iface.parseLog({
            topics: [...event!.topics],
            data: event!.data
        });

        // Assert timestamp is close to block.timestamp (within 2 seconds for safety)
        const emittedTimestamp = decoded!.args._timestamp;
        const blockAfter = await ethers.provider.getBlock(receipt!.blockNumber);
        const expectedTimestamp = blockAfter!.timestamp;

        // The timestamp should match block.timestamp, not block.prevrandao (which would be a large random number)
        expect(emittedTimestamp).to.be.closeTo(expectedTimestamp, 2);
        // Additionally, prevrandao is typically a huge 256-bit value, so timestamp should be much smaller
        expect(emittedTimestamp).to.be.lessThan(2 ** 64); // sanity check that it's not prevrandao
    });
});