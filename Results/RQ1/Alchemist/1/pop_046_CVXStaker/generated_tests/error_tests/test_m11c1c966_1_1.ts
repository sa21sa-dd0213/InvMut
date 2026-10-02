import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m11c1c966 - constructor operator assignment", function () {
  it("should revert when calling depositAndStake from the specified operator address if operator was set to address(this) instead", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock contracts needed for CVXStaker constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardTokens: string[] = [addr1.address]; // dummy address for reward token array

    // Deploy CVXStaker with a specific operator address
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // The mutant sets operator = address(this), so the specified operator.address is ignored.
    // Try to call depositAndStake from the specified operator address - should fail because
    // the operator is now the contract itself, not the external operator address
    await expect(
      staker.connect(operator).depositAndStake(ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(staker, "NotOperator");

    // Verify the operator is actually the contract address, not the specified operator
    const actualOperator = await staker.operator();
    expect(actualOperator).to.equal(await staker.getAddress());
    expect(actualOperator).to.not.equal(operator.address);
  });
});