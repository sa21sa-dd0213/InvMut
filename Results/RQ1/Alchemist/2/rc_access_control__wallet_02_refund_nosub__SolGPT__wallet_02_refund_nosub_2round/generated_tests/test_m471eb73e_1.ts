import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Wallet mutant test - withdraw partial amount", function () {
    it("should revert when withdrawing less than full balance after mutant changes <= to ==", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Wallet");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // addr1 deposits 2 ETH
        const depositAmount = ethers.parseEther("2");
        await instance.connect(addr1).deposit({ value: depositAmount });

        // addr1 attempts to withdraw only 1 ETH (partial withdrawal)
        const withdrawAmount = ethers.parseEther("1");
        await expect(
            instance.connect(addr1).withdraw(withdrawAmount)
        ).to.be.reverted;

        // Verify balance remains unchanged
        const balance = await ethers.provider.getBalance(instance.getAddress());
        expect(balance).to.equal(depositAmount);
    });
});