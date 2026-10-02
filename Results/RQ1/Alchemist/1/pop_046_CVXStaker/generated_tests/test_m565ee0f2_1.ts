import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m565ee0f2 - onlyOperatorOrOwner modifier", function () {
  it("should allow operator to call withdrawAndUnwrap and not revert", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock contracts for constructor dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockClpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000"));
    await mockClpToken.waitForDeployment();
    
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const mockBooster = await MockBooster.deploy();
    await mockBooster.waitForDeployment();
    
    const rewardTokens: string[] = [];
    
    // Deploy CVXStaker with operator as the operator address
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await mockClpToken.getAddress(),
      await mockBooster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();
    
    // Set cvxPoolInfo with a valid pool (pId 0, which is not shutdown by default)
    await staker.connect(owner).setCvxPoolInfo(0, await mockClpToken.getAddress(), ethers.ZeroAddress);
    
    // Transfer some CLP tokens to the staker for the test
    await mockClpToken.transfer(await staker.getAddress(), ethers.parseEther("100"));
    
    // Call withdrawAndUnwrap as the operator - should NOT revert on original, WILL revert on mutant
    await expect(
      staker.connect(operator).withdrawAndUnwrap(ethers.parseEther("10"), false, addr1.address)
    ).to.not.be.reverted;
  });
});