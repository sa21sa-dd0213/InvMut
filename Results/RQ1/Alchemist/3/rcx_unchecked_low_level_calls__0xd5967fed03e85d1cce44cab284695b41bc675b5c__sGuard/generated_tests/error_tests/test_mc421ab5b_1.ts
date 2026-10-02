import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant test - kill mc421ab5b", function () {
  it("should return true on successful transfer, detecting mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create an array of target addresses
    const recipients = [addr1.address, addr2.address];
    
    // Call transfer with dummy values - from, caddress, tos, value
    // The contract calls transferFrom on caddress, but we just care about the return value
    const tx = await instance.transfer(
      owner.address,
      addr1.address, // caddress - will be called but can fail silently
      recipients,
      ethers.parseEther("1")
    );
    
    // Wait for transaction and get return value
    const receipt = await tx.wait();
    
    // For ethers v6, we need to get the return value differently
    // Call static to check the actual return value
    const result = await instance.transfer.staticCall(
      owner.address,
      addr1.address,
      recipients,
      ethers.parseEther("1")
    );
    
    // Original returns true, mutant returns false
    expect(result).to.equal(true);
  });
});