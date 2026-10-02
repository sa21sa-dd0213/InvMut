import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker - Mutant mf60f1b3f", function () {
  it("should revert when calling withdrawAndUnwrap from unauthorized address", async function () {
    const [owner, operator, unauthorized] = await ethers.getSigners();
    
    // Deploy mock contracts needed for CVXStaker constructor
    const MockToken = await ethers.getContractFactory("IERC20");
    const MockBooster = await ethers.getContractFactory("ICVXBooster");
    const MockRewardPool = await ethers.getContractFactory("IBaseRewardPool");
    
    // Deploy mock CLP token
    const clpToken = await MockToken.deploy();
    await clpToken.waitForDeployment();
    
    // Deploy mock booster
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Prepare constructor arguments
    const rewardTokens: string[] = [];
    const constructorArgs = [
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    ];
    
    // Deploy CVXStaker
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStakerFactory.deploy(...constructorArgs);
    await staker.waitForDeployment();
    
    // Transfer ownership to owner
    await staker.connect(owner).transferOwnership(owner.address);
    
    // Attempt to call withdrawAndUnwrap from unauthorized address
    await expect(
      staker.connect(unauthorized).withdrawAndUnwrap(
        ethers.parseEther("100"),
        false,
        ethers.ZeroAddress
      )
    ).to.be.revertedWithCustomError(staker, "NotOperatorOrOwner");
  });
});