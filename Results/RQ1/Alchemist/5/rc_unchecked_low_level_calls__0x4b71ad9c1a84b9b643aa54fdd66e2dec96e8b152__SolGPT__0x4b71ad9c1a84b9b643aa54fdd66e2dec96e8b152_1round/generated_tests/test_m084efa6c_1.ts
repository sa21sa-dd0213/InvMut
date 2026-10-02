import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airPort mutant m084efa6c test", function () {
  it("should revert when transferFrom call fails on original but pass silently on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the airPort contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that will revert on transferFrom call
    // We use a minimal contract that always reverts
    const revertFactory = await ethers.getContractFactory("contract Reverter { function transferFrom(address, address, uint256) external pure returns (bool) { revert(); } }");
    const reverter = await revertFactory.deploy();
    await reverter.waitForDeployment();
    
    // Prepare the recipients array
    const recipients = [addr2.address];
    
    // Attempt the transfer - should revert in original (require(_s) catches failure)
    // In mutant, it will not revert and return true
    await expect(
      instance.transfer(owner.address, reverter.target, recipients, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});