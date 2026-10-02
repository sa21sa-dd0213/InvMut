import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant kill test", function () {
  it("should kill mutant m8d76b967 by sending exactly 1 wei and checking owner balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get owner's initial balance
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    
    // Send exactly 1 wei to the go function
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();
    
    // Get owner's balance after
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    
    // In original: 1 wei sent to target, 0 left for owner -> owner balance unchanged
    // In mutant: 0 wei sent to target, 1 wei stays and goes to owner -> owner balance increases by 1
    // Test expects original behavior (no increase for owner)
    expect(ownerBalanceAfter).to.equal(ownerBalanceBefore);
  });
});