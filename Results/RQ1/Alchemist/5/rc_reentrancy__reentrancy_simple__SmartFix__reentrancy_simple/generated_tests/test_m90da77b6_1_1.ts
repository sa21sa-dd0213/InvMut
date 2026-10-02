import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m90da77b6 test", function () {
    it("should revert on overflow when adding to balance (original), but mutant allows overflow", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Reentrance");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // First, add a small amount to have a base balance
        const smallAmount = ethers.parseEther("1");
        await instance.connect(owner).addToBalance({ value: smallAmount });

        // Now attempt to send an amount that would cause overflow:
        // current balance = 1 ether = 10^18 wei
        // We want to send max uint256 - 10^18 + 1 to cause wrap to 0
        const maxUint256 = ethers.MaxUint256;
        const overflowAmount = maxUint256 - smallAmount + 1n;

        // On the original contract, the require check should revert
        // On the mutant, it will succeed and balance will wrap to 0
        await expect(
            instance.connect(owner).addToBalance({ value: overflowAmount })
        ).to.be.reverted;
    });
});