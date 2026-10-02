import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant test - event emission", function () {
  it("should detect mutant mf3bdeced by verifying SetCvxPoolInfo event is emitted", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock CLP token (simple ERC20)
    const MockToken = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockToken.deploy("CLP Token", "CLP");
    await clpToken.waitForDeployment();

    // Deploy mock Booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    // Reward tokens array (empty for simplicity)
    const rewardTokens: string[] = [];

    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      owner.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Test parameters
    const testPId = 1;
    const testToken = await clpToken.getAddress();
    const testRewards = addr1.address;

    // Call setCvxPoolInfo and expect event emission
    await expect(
      staker.connect(owner).setCvxPoolInfo(testPId, testToken, testRewards)
    )
      .to.emit(staker, "SetCvxPoolInfo")
      .withArgs(testPId, testToken, testRewards);
  });
});

// Mock contracts needed for testing
// Note: These should be deployed as separate contracts in the test environment
// but are included here for completeness
const MockERC20 = {
  abi: [
    "constructor(string name, string symbol)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address, uint256) returns (bool)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)",
  ],
  bytecode: "0x..."
};

const MockBooster = {
  abi: [
    "constructor()",
    "function poolInfo(uint256) view returns (tuple(address lptoken, address token, address gauge, address crvRewards, address stash, bool shutdown))",
  ],
  bytecode: "0x..."
};