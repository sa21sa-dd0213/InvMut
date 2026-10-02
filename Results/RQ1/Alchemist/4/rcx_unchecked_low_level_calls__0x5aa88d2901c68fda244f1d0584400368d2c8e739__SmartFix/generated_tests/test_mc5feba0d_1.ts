import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant mc5feba0d test", function () {
    it("should allow Owner to call Command without revert (original behavior)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract so it has some balance
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });

        // Owner calls Command with empty data and 0 value - should succeed in original
        const tx = instance.connect(owner).Command(addr1.address, "0x");
        await expect(tx).to.not.be.reverted;
    });
});