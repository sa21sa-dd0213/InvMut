import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker mutant m7e18788f - operator set to address(0)", function () {
  it("should revert when calling depositAndStake from non-zero operator address due to operator being address(0)", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock contracts for constructor arguments
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();
    
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    const rewardTokens: string[] = [];
    
    // Deploy CVXStaker with operator address set to operator (non-zero)
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const cvxStaker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await cvxStaker.waitForDeployment();
    
    // Try to call depositAndStake from the operator address
    // In the mutant, operator is set to address(0) instead of operator.address
    // So calling from operator.address should revert with NotOperator()
    await expect(
      cvxStaker.connect(operator).depositAndStake(ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(cvxStaker, "NotOperator");
  });
});