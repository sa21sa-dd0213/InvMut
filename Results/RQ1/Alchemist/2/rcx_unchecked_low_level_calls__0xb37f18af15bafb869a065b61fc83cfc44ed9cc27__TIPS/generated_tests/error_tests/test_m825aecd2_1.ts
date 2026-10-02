import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet mutant test - withdrawAll modifier removed", function () {
    it("should revert when non-owner calls withdrawAll on original, but succeed on mutant", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("SimpleWallet");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract so there is balance to withdraw
        const fundAmount = ethers.parseEther("1");
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: fundAmount
        });

        // Attempt to call withdrawAll from a non-owner address
        await expect(
            instance.connect(addr1).withdrawAll()
        ).to.be.reverted;
    });
});