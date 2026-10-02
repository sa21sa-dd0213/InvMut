import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m497ac0f5", function () {
  it("should return true from transfer() on original, but mutant returns false", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed based on the contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data
    const recipients = [owner.address];
    const amounts = [1]; // 1 token in ether units

    // Call transfer from the authorized address (0x9797...)
    const tx = await instance.connect(owner).transfer(recipients, amounts);
    await tx.wait();

    // Check that the return value is true (original behavior)
    // On the mutant, the return statement is removed, so it will return false
    const result = await instance.connect(owner).transfer.staticCall(recipients, amounts);
    expect(result).to.equal(true);
  });
});