import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m277fac66 test", function () {
    it("should kill mutant by sending exactly 10 ether and expecting success (no revert)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Roulette");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract with initial balance for potential transfer
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("100")
        });

        // Send exactly 10 ether to fallback - should succeed in original, revert in mutant
        const tx = addr1.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("10")
        });

        // The original accepts 10 ether; the mutant requires 11 ether (msg.value-1 == 10)
        // So the mutant will revert, killing it
        await expect(tx).to.not.be.reverted;
    });
});