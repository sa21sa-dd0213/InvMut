import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant test - onlyOperator modifier", function () {
  it("should revert when non-operator calls depositAndStake (kills mutant that removed revert)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock CLP token (simple ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();
    
    // Deploy mock Booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Deploy CVXStaker with constructor arguments:
    // address _operator, IERC20 _clpToken, ICVXBooster _booster, address[] memory _rewardTokens
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const rewardTokens: string[] = []; // empty array for simplicity
    const instance = await CVXStaker.deploy(
      owner.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await instance.waitForDeployment();
    
    // Setup pool info so depositAndStake doesn't revert on shutdown check
    // Set pool info via owner
    await instance.setCvxPoolInfo(0, await clpToken.getAddress(), ethers.ZeroAddress);
    
    // Fund CLP token to CVXStaker for allowance
    await clpToken.transfer(await instance.getAddress(), ethers.parseEther("100"));
    
    // Try to call depositAndStake from non-operator (addr1)
    // The original contract should revert with NotOperator
    // The mutant (which removed the revert) would proceed without reverting
    await expect(
      instance.connect(addr1).depositAndStake(ethers.parseEther("10"))
    ).to.be.reverted;
  });
});