import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
    it("should detect mutant m72f51d85 by checking balance consistency after deposit and withdrawal", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("ReentrancyDAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Initial state: balance should be 0
        expect(await instance.balance()).to.equal(0);

        // Deposit exactly 1 ether
        const depositAmount = ethers.parseEther("1");
        const tx = await instance.connect(owner).deposit({ value: depositAmount });
        await tx.wait();

        // After deposit, balance should equal the sum of credits
        // In original: balance = depositAmount, credit[owner] = depositAmount
        // In mutant: balance = depositAmount + 1, credit[owner] = depositAmount
        const balanceAfterDeposit = await instance.balance();
        const creditAfterDeposit = await instance.credit(owner.address);
        
        // In the original, balance equals credit
        // In the mutant, balance is credit + 1
        expect(balanceAfterDeposit).to.equal(creditAfterDeposit, 
            "Balance should equal credit after deposit - mutant would fail here");

        // Withdraw all
        const withdrawTx = await instance.connect(owner).withdrawAll();
        await withdrawTx.wait();

        // After withdrawal, both balance and credit should be 0
        const finalBalance = await instance.balance();
        const finalCredit = await instance.credit(owner.address);
        
        expect(finalBalance).to.equal(0, "Balance should be 0 after full withdrawal");
        expect(finalCredit).to.equal(0, "Credit should be 0 after full withdrawal");
    });
});