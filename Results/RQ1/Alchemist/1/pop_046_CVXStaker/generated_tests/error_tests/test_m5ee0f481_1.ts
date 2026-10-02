import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m5ee0f481 - setRewardsRecipient access control", function () {
  it("should revert when non-owner calls setRewardsRecipient", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts needed for constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockClpToken = await MockERC20.deploy("CLP Token", "CLP");
    await mockClpToken.waitForDeployment();
    
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const mockBooster = await MockBooster.deploy();
    await mockBooster.waitForDeployment();
    
    // Constructor arguments: _operator, _clpToken, _booster, _rewardTokens
    const operator = addr1.address;
    const rewardTokens: string[] = [];
    
    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(
      operator,
      mockClpToken.target,
      mockBooster.target,
      rewardTokens
    );
    await instance.waitForDeployment();
    
    // Attempt to call setRewardsRecipient from non-owner address (addr2)
    // The original contract should revert because of onlyOwner modifier
    // The mutant (without onlyOwner) would not revert, thus failing this test
    await expect(
      instance.connect(addr2).setRewardsRecipient(addr2.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});