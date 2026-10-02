import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m3a4d1bf4 test", function () {
  it("should revert when non-owner calls setOperator (onlyOwner modifier removed in mutant)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Mock addresses for constructor - using random addresses since we just need a deployed contract
    const mockClpToken = "0x0000000000000000000000000000000000000001";
    const mockBooster = "0x0000000000000000000000000000000000000002";
    const mockRewardTokens: string[] = [];
    
    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(
      owner.address, // operator
      mockClpToken,  // clpToken
      mockBooster,   // booster
      mockRewardTokens // rewardTokens
    );
    await instance.waitForDeployment();
    
    // Non-owner should NOT be able to call setOperator (this should revert in original, but succeed in mutant)
    await expect(
      instance.connect(addr1).setOperator(addr2.address)
    ).to.be.reverted;
  });
});