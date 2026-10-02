import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant detection - onlyOperatorOrOwner modifier", function () {
  it("should allow owner to call withdrawAndUnwrap (mutant breaks owner access)", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock contracts for constructor arguments
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();
    
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    const rewardTokens: string[] = [];
    
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const instance = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await instance.waitForDeployment();
    
    // Fund the contract with some CLP tokens for the test
    await clpToken.mint(await instance.getAddress(), ethers.parseEther("100"));
    
    // Owner should be able to call withdrawAndUnwrap without reverting
    // In the mutant, the owner will be reverted because msg.sender == owner() triggers the revert
    await expect(
      instance.connect(owner).withdrawAndUnwrap(
        ethers.parseEther("10"),
        false,
        addr1.address
      )
    ).to.not.be.reverted;
  });
});