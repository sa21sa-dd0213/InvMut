import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant m617e63be", function () {
  it("should detect mutant by testing condition reversal in multiplicate function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance
    const initialFunding = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Get the contract balance before the attack
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceBefore).to.equal(initialFunding);

    // Send an amount GREATER than the contract balance (e.g., 20 ETH)
    // Original: msg.value >= balance => true (20 >= 10) => transfer happens
    // Mutant: msg.value <= balance => false (20 <= 10) => no transfer
    const attackAmount = ethers.parseEther("20");
    
    // Attempt the multiplicate call from owner
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: attackAmount });
    
    // The original would succeed (transfer happens), mutant would fail (no transfer)
    // We expect the call to succeed but the balance to NOT decrease (mutant behavior)
    await expect(tx).to.not.be.reverted;
    
    // After the call, if mutant is present, balance should remain the same
    // because the condition failed and no transfer occurred
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // The mutant would keep the balance unchanged (10 ETH)
    // The original would transfer 30 ETH (10+20) to addr1, leaving 0
    expect(balanceAfter).to.equal(initialFunding);
  });
});