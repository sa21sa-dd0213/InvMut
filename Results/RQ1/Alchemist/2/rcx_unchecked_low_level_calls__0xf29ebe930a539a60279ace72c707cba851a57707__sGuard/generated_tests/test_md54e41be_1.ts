import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant kill test - md54e41be", function () {
  it("should fail when sending exactly 1 wei because mutant sends msg.value+1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Record owner's initial balance
    const ownerInitialBalance = await ethers.provider.getBalance(owner.address);
    
    // Send exactly 1 wei to the go function
    const tx = await instance.connect(addr1).go({ value: 1 });
    const receipt = await tx.wait();

    // On the mutant, the contract tries to send 2 wei (msg.value+1) but only received 1 wei
    // This causes the call to fail and the contract retains the 1 wei
    // Check that owner did NOT receive the full balance (as it would in original)
    const ownerFinalBalance = await ethers.provider.getBalance(owner.address);
    const contractBalance = await ethers.provider.getBalance(instance.target);
    
    // Original behavior: owner receives contract's full balance (1 wei), contract balance becomes 0
    // Mutant behavior: call fails, contract keeps the 1 wei, owner receives nothing
    expect(contractBalance).to.equal(1);
    expect(ownerFinalBalance).to.equal(ownerInitialBalance);
  });
});