import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test - m44692e9d", function () {
  it("should succeed when passing a non-empty array of recipients (kills mutant that changed > to <)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare test data: a non-empty array of recipients
    const recipients = [addr1.address];
    const value = ethers.parseEther("1");
    
    // This should succeed on the original (length > 0) and revert on the mutant (length < 0 is always false)
    // On the mutant, the require will always fail, so the transaction will revert
    // We expect it to succeed (not revert) to detect that the mutant is different
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, value)
    ).to.not.be.reverted;
  });
});