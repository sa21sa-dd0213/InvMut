import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test", function () {
    it("should kill mutant by sending exactly 10 ether and expecting success in original but revert in mutant", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Roulette");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract with some initial balance so transfer can work
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("10")
        });

        // Record contract balance before
        const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

        // Send exactly 10 ether to fallback - should succeed in original, but fail in mutant
        // because mutant requires msg.value + 1 == 10 ether (i.e., 9 ether)
        await expect(
            addr1.sendTransaction({
                to: await instance.getAddress(),
                value: ethers.parseEther("10")
            })
        ).to.be.reverted;

        // Verify contract balance didn't change (transaction reverted)
        const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
        expect(balanceAfter).to.equal(balanceBefore);
    });
});