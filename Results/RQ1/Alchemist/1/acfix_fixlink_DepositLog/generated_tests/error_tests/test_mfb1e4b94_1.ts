import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - mfb1e4b94", function () {
    it("should reject logRegisteredPubkey call from unapproved address and not emit RegisteredPubkey event", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("DepositLog");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // addr1 is not an approved logger
        const tx = await instance.connect(addr1).logRegisteredPubkey(
            ethers.hexlify(ethers.randomBytes(32)),
            ethers.hexlify(ethers.randomBytes(32))
        );
        const receipt = await tx.wait();

        // In the original contract, the call should return false and no event should be emitted
        // In the mutant, the call succeeds and emits the event - this assertion will fail
        const events = receipt.logs.filter(
            (log: any) => log.topics[0] === ethers.id("RegisteredPubkey(address,bytes32,bytes32,uint256)")
        );
        expect(events.length).to.equal(0);
    });
});