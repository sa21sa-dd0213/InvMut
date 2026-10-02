import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection", function () {
    it("should kill mutant m71fd66aa by sending positive msg.value to Put and expecting success", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MONEY_BOX");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Initialize the contract (required before Put can be called meaningfully)
        await (await instance.Initialized()).wait();

        // Send 1 wei to Put - this should succeed in original but revert in mutant
        const tx = await instance.Put(0, { value: 1 });
        await expect(tx).to.not.be.reverted;

        // Verify balance increased (optional but thorough)
        const holder = await instance.Acc(owner.address);
        expect(holder.balance).to.equal(1);
    });
});