import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m73311e4d", function () {
  it("should revert when calling transfer on the mutant because caddress is address(this) instead of external contract", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The contract's from address is hardcoded to the owner
    // Prepare test data: one recipient and one value
    const tos = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 10^18 internally)
    
    // Call transfer from the authorized address (msg.sender == from address)
    // In the mutant, caddress = address(this), so the call will try to call
    // transferFrom on itself which doesn't exist, causing revert
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted;
  });
});