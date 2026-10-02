import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection test", function () {
  it("should kill mutant mdc8e1c39 by sending msg.value exactly one wei less than contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether
    const initialBalance = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });
    
    // Check current contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send exactly one wei less than the current balance to trigger the mutant behavior
    const msgValue = contractBalance - 1n;
    
    // Get contract balance before the call
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Call multiplicate from owner
    await instance.connect(owner).multiplicate(addr1.address, { value: msgValue });
    
    // Get contract balance after the call
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // In the original contract, the condition msg.value >= balance is false (msg.value is balance-1),
    // so no transfer should happen. In the mutant, the condition msg.value+1 >= balance is true,
    // causing an incorrect transfer. We expect the original behavior: balance unchanged.
    expect(balanceAfter).to.equal(balanceBefore);
  });
});