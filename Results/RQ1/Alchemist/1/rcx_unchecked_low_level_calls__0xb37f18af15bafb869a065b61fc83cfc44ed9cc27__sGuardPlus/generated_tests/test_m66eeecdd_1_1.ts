import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - withdrawAll modifier removal", function () {
    it("should revert when non-owner calls withdrawAll on original contract, but succeed on mutant", async function () {
        const [owner, nonOwner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("SimpleWallet");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract with some ether
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });

        // Attempt to call withdrawAll from non-owner address
        // On the original contract (with onlyOwner modifier) this should revert
        // On the mutant (without modifier) this would succeed and drain funds
        await expect(
            instance.connect(nonOwner).withdrawAll()
        ).to.be.reverted;
    });
});