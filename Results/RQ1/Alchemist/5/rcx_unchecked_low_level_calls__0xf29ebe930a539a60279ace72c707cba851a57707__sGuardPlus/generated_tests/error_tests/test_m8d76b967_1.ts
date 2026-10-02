import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m8d76b967 - msg.value-1", function () {
  it("should detect mutant by sending 1 wei and checking owner balance unchanged", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get owner's initial balance
    const ownerInitialBalance = await ethers.provider.getBalance(owner.address);

    // Send exactly 1 wei to the go function
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();

    // Get owner's balance after transaction
    const ownerFinalBalance = await ethers.provider.getBalance(owner.address);

    // In the original contract, the owner receives 0 wei (all 1 wei sent to target)
    // In the mutant, msg.value-1 = 0 wei sent to target, so 1 wei remains and goes to owner
    // Assert that owner balance did NOT change (kills the mutant)
    expect(ownerFinalBalance).to.equal(ownerInitialBalance);
  });
});