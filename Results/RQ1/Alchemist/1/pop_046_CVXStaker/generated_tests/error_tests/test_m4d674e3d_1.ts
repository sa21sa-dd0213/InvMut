import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant detection - onlyOperatorOrOwner", function () {
  it("should revert when operator calls withdrawAndUnwrap if mutant changes condition to msg.sender == operator && msg.sender != owner", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock contracts needed for constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardTokens: string[] = []; // Empty array for simplicity

    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await instance.waitForDeployment();

    // Set up CVX pool info so withdrawAndUnwrap can be called
    await instance.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), await booster.getAddress());

    // Operator tries to call withdrawAndUnwrap - should succeed in original, fail in mutant
    // The mutant changes the modifier to revert when msg.sender == operator && msg.sender != owner
    // Since operator is not owner, this should revert in the mutant
    await expect(
      instance.connect(operator).withdrawAndUnwrap(0, false, ethers.ZeroAddress)
    ).to.be.revertedWith("NotOperatorOrOwner");
  });
});