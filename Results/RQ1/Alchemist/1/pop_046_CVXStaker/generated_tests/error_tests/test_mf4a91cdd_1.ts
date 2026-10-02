import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker - mutant mf4a91cdd test", function () {
  it("should revert when owner calls withdrawAndUnwrap on the mutant due to incorrect <= comparison", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock tokens and contracts needed for CVXStaker constructor
    const CLPToken = await ethers.getContractFactory("MockERC20");
    const clpToken = await CLPToken.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();

    const Booster = await ethers.getContractFactory("MockBooster");
    const booster = await Booster.deploy();
    await booster.waitForDeployment();

    const rewardTokens: string[] = [addr1.address]; // dummy reward token address

    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const cvxStaker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await cvxStaker.waitForDeployment();

    // Set up cvxPoolInfo so withdrawAndUnwrap can be called
    await cvxStaker.connect(owner).setCvxPoolInfo(
      0,
      await clpToken.getAddress(),
      addr1.address // dummy rewards address
    );

    // The owner should be able to call withdrawAndUnwrap (since owner is authorized)
    // On the mutant, msg.sender <= owner() will be true when owner calls (owner == owner),
    // causing an unexpected revert. The test expects the call to succeed on the original.
    await expect(
      cvxStaker.connect(owner).withdrawAndUnwrap(0, false, ethers.ZeroAddress)
    ).to.not.be.reverted;
  });
});