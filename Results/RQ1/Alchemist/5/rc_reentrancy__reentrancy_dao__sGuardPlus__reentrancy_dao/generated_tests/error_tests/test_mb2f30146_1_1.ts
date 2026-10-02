import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
    it("should kill mutant mb2f30146 by depositing 1 wei and then withdrawing", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("ReentrancyDAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deposit exactly 1 wei from addr1
        const depositTx = await instance.connect(addr1).deposit({ value: 1 });
        await depositTx.wait();

        // Attempt to withdraw all
        const withdrawTx = instance.connect(addr1).withdrawAll();
                
        // On the original contract, withdrawAll should succeed (credit[addr1] = 1, balance = 1)
        // On the mutant, credit[addr1] = 0 (since 1 - 1 = 0), so withdrawAll does nothing or reverts
        // We expect the mutant to fail this test because the balance should not be reduced
        await expect(withdrawTx).to.changeEtherBalance(addr1, 1);
    });
});