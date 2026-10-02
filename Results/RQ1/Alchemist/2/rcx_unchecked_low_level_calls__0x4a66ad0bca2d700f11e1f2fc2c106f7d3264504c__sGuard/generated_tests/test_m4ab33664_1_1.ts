import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test m4ab33664", function () {
  it("should revert on empty _tos array in mutant, but succeed with non-empty array in original", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare valid inputs: non-empty array with one address and matching value
    const recipients = ["0x0000000000000000000000000000000000000001"];
    const amounts = [1]; // Will be multiplied by 1e18 inside transfer
    
    // This call should succeed on original (non-empty array > 0)
    // But will revert on mutant because require(_tos.length < 0) is always false
    await expect(
      instance.connect(owner).transfer(recipients, amounts)
    ).to.not.be.reverted;
  });
});