import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m4ab33664", function () {
  it("should succeed when _tos.length > 0 (original behavior) but mutant will revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare valid inputs: two recipients and corresponding values
    const recipients = [addr1.address, addr2.address];
    const values = [1, 2]; // Will be multiplied by 10^18 inside transfer
    
    // Call transfer from the authorized address (owner)
    // Original should succeed, mutant should revert because _tos.length < 0 is always false
    await expect(
      instance.connect(owner).transfer(recipients, values)
    ).to.be.reverted;
  });
});