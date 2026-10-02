import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m7e18788f - operator set to address(0)", function () {
  it("should revert when operator calls depositAndStake because operator is address(0)", async function () {
    const [owner, operator] = await ethers.getSigners();
    
    // Deploy mock tokens and booster for constructor
    const CLPToken = await ethers.getContractFactory("ERC20Mock");
    const clpToken = await CLPToken.deploy("CLP", "CLP", 18);
    await clpToken.waitForDeployment();
    
    const Booster = await ethers.getContractFactory("CVXBoosterMock");
    const booster = await Booster.deploy();
    await booster.waitForDeployment();
    
    const rewardTokens: string[] = [];
    
    // Deploy CVXStaker with non-zero operator
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();
    
    // Set pool info first (required for depositAndStake)
    await staker.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), ethers.ZeroAddress);
    
    // Fund the staker with some CLP tokens for allowance
    await clpToken.mint(operator.address, ethers.parseEther("100"));
    await clpToken.connect(operator).approve(await staker.getAddress(), ethers.parseEther("100"));
    
    // The operator should not be able to call depositAndStake since operator is address(0)
    await expect(
      staker.connect(operator).depositAndStake(ethers.parseEther("10"))
    ).to.be.revertedWithCustomError(staker, "NotOperator");
  });
});