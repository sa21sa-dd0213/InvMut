import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m8d6bd7d3 test", function () {
    it("should send entire balance to owner, not keep it in contract", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("B");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Fund the contract with some ETH via go() from addr1
        const tx = await instance.connect(addr1).go({ value: ethers.parseEther("1.0") });
        await tx.wait();
        
        // After go() executes, the contract should have transferred its entire balance to owner
        // In the original, target.call sends ETH to 0xC8A60..., then owner gets balance
        // In mutant, target = address(this), so contract sends ETH to itself, then owner gets 0
        const contractBalance = await ethers.provider.getBalance(instance.target);
        expect(contractBalance).to.equal(0);
    });
});