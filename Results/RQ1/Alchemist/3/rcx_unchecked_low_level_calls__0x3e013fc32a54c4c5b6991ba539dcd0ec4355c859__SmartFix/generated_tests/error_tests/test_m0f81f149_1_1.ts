import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
    it("should revert when Command is called by unauthorized address", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX4");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const data = "0x";
        // Attempt to call Command from unauthorized address (addr1) - should revert in original
        await expect(
            instance.connect(addr1).Command(addr1.address, data, { value: ethers.parseEther("1") })
        ).to.be.reverted;
    });
});