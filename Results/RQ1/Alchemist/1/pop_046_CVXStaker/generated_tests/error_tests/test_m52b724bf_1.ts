import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m52b724bf - depositAndStake modifier removal", function () {
  it("should revert when non-operator calls depositAndStake (detect missing onlyOperator modifier)", async function () {
    const [owner, operator, attacker] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    // For testing we need mock addresses since we don't have real contracts
    // We'll use the attacker address as a placeholder for required interfaces
    const mockToken = attacker.address; // IERC20
    const mockBooster = attacker.address; // ICVXBooster
    const rewardTokens: string[] = []; // empty array for reward tokens
    
    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(
      operator.address,  // _operator
      mockToken,         // _clpToken
      mockBooster,       // _booster
      rewardTokens       // _rewardTokens
    );
    await instance.waitForDeployment();

    // Attempt to call depositAndStake from a non-operator address
    // The original contract would revert with NotOperator error
    // The mutant would allow the call to proceed (which would then fail on the underlying booster call)
    await expect(
      instance.connect(attacker).depositAndStake(ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(instance, "NotOperator");
  });
});