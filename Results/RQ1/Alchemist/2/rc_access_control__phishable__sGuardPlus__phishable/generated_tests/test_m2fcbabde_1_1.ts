import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection", function () {
    it("should revert when non-owner calls withdrawAll (kills mutant that removes access control)", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Phishable");
        const instance = await Factory.deploy(owner.address);
        await instance.waitForDeployment();

        // Fund the contract so withdrawAll has balance to transfer
        const fundTx = await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });
        await fundTx.wait();

        // Attempt to withdraw from unauthorized address - should revert in original
        await expect(
            instance.connect(addr1).withdrawAll(addr2.address)
        ).to.be.reverted;
    });
});