import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - md954df0d", function () {
    it("should kill mutant by depositing and then withdrawing, expecting balance transfer to occur", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("ReentrancyDAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const depositAmount = ethers.parseEther("1.0");
        
        // Deposit Ether
        await instance.connect(addr1).deposit({ value: depositAmount });
        
        // Get initial balances
        const initialContractBalance = await ethers.provider.getBalance(instance.target);
        const initialUserBalance = await ethers.provider.getBalance(addr1.address);
        
        // Withdraw all
        const tx = await instance.connect(addr1).withdrawAll();
        const receipt = await tx.wait();
        
        // Get gas used
        const gasUsed = receipt.gasUsed;
        const gasPrice = tx.gasPrice;
        const gasCost = gasUsed * gasPrice;
        
        // Get final balances
        const finalContractBalance = await ethers.provider.getBalance(instance.target);
        const finalUserBalance = await ethers.provider.getBalance(addr1.address);
        
        // Verify the withdrawal happened (this will fail on mutant where condition oCredit < 0 is never true)
        expect(finalContractBalance).to.equal(0);
        expect(finalUserBalance).to.equal(initialUserBalance + depositAmount - gasCost);
    });
});