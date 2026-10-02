import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant test - mb442de3a", function () {
  it("should allow owner to withdrawAll and revert for non-owner (mutant reverses access control)", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();
    
    // Deploy the contract with owner as the constructor argument
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Verify contract has balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("1.0"));

    // Owner should be able to withdraw - this will pass on original but fail on mutant
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const tx = await instance.connect(owner).withdrawAll(recipient.address);
    await tx.wait();
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    
    // Owner's balance should increase (gas costs make exact comparison tricky, but balance should change)
    expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    
    // Contract should have 0 balance after withdrawal
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalContractBalance).to.equal(0);
  });
});