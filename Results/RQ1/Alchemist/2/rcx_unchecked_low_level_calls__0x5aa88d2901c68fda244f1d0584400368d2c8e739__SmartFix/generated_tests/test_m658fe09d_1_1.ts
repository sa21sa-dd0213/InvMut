import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant m658fe09d (Command without owner check)", function () {
    it("should revert when non-owner calls Command, but mutant allows it", async function () {
        const [owner, attacker] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract so it has balance
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });

        // Prepare call data (any arbitrary call, e.g., to selfdestruct or drain)
        const callData = "0x";

        // Attacker tries to call Command - should revert on original, succeed on mutant
        await expect(
            instance.connect(attacker).Command(owner.address, callData, { value: 0 })
        ).to.be.reverted;
    });
});