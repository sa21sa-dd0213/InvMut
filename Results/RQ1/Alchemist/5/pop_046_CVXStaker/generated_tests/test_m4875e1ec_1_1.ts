import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m4875e1ec - setRewardsRecipient", function () {
  it("should kill the mutant by verifying rewardsRecipient is set correctly after calling setRewardsRecipient with a non-zero address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts needed for CVXStaker constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP");
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardTokens = [clpToken.target];

    // Deploy CVXStaker with required constructor arguments
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      addr1.target,  // operator
      clpToken.target,  // clpToken
      booster.target,  // booster
      rewardTokens  // rewardTokens
    );
    await staker.waitForDeployment();

    // Set the cvxPoolInfo so reward operations work
    await staker.connect(owner).setCvxPoolInfo(
      0,  // _pId
      clpToken.target,  // _token
      clpToken.target  // _rewards (using clpToken as mock rewards contract)
    );

    // Call setRewardsRecipient with a non-zero address
    const nonZeroRecipient = addr2.target;
    await staker.connect(owner).setRewardsRecipient(nonZeroRecipient);

    // Check the rewardsRecipient state variable
    const actualRecipient = await staker.rewardsRecipient();

    // In the original contract, rewardsRecipient should be set to nonZeroRecipient
    // In the mutant, it will always be address(0), so this assertion will fail
    expect(actualRecipient).to.equal(nonZeroRecipient);

    // Additional check: verify it's not address(0) to further ensure the mutant is killed
    const zeroAddress = ethers.ZeroAddress;
    expect(actualRecipient).to.not.equal(zeroAddress);
  });
});