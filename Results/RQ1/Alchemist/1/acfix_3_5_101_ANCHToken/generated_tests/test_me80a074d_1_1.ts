import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - me80a074d", function () {
  it("should revert when transferring zero tokens (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with mock router address and mock USDC address
    // Note: We need valid addresses for the constructor, but they won't be used in this test
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDC = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDC);
    await instance.waitForDeployment();
    
    // Get the current owner's balance
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Attempt to transfer 0 tokens - should revert in original contract
    // The mutant removes the require check, so it would pass instead of reverting
    await expect(
      instance.connect(owner).transfer(addr1.address, 0)
    ).to.be.revertedWith("Transfer amount must be greater than zero");
  });
});