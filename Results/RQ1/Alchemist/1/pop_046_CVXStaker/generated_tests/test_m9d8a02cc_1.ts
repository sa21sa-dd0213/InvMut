import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker - mutant m9d8a02cc (SetRewardsRecipient event emission)", function () {
  it("should emit SetRewardsRecipient event when setRewardsRecipient is called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock contracts for constructor arguments
    const MockToken = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockToken.deploy("CLP Token", "CLP");
    await clpToken.waitForDeployment();
    
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    const rewardTokens: string[] = [];
    
    // Deploy CVXStaker
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    const cvxStaker = await CVXStakerFactory.deploy(
      addr1.address,          // operator
      await clpToken.getAddress(), // clpToken
      await booster.getAddress(),  // booster
      rewardTokens            // rewardTokens
    );
    await cvxStaker.waitForDeployment();
    
    // Test that setRewardsRecipient emits the SetRewardsRecipient event
    const recipientAddress = addr1.address;
    await expect(cvxStaker.connect(owner).setRewardsRecipient(recipientAddress))
      .to.emit(cvxStaker, "SetRewardsRecipient")
      .withArgs(recipientAddress);
  });
});