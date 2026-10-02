import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection test", function () {
    it("should kill mutant mb915be43 by depositing 1 wei and expecting successful withdrawal", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("ReentrancyDAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deposit exactly 1 wei from addr1
        const depositTx = await instance.connect(addr1).deposit({ value: 1 });
        await depositTx.wait();

        // Attempt to withdraw all - should succeed in original but revert in mutant due to balance underflow
        const withdrawTx = instance.connect(addr1).withdrawAll();
                
        // The mutant causes balance to be 0 instead of 1, leading to underflow revert
        await expect(withdrawTx).to.not.be.reverted;
                
        // Verify the withdrawal actually returned the 1 wei
        const balanceAfter = await ethers.provider.getBalance(instance.target);
        expect(balanceAfter).to.equal(0);
    });
});