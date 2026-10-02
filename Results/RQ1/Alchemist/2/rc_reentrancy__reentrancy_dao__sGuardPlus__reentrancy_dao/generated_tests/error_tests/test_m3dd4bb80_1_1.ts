import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection - m3dd4bb80", function () {
    it("should kill mutant by detecting credit/balance mismatch after deposit", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("ReentrancyDAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deposit exactly 1 ether
        const depositAmount = ethers.parseEther("1");
        const tx = await instance.connect(addr1).deposit({ value: depositAmount });
        await tx.wait();

        // Attempt to withdrawAll - on mutant this will try to send depositAmount + 1 wei,
        // but contract only has depositAmount, causing revert
        await expect(
            instance.connect(addr1).withdrawAll()
        ).to.be.reverted;

        // Verify contract balance is still the deposited amount (mutant failed to drain)
        const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
        expect(contractBalance).to.equal(depositAmount);
    });
});