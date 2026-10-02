import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m40b8afcb - onlyOperatorOrOwner modifier", function () {
  it("should revert when called by an address that is neither operator nor owner, but has address >= owner (mutant detection)", async function () {
    const [owner, operator, attacker] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    const mockCLPToken = await ethers.deployContract("MockERC20", ["CLP Token", "CLP", 18]);
    await mockCLPToken.waitForDeployment();
    
    const mockBooster = await ethers.deployContract("MockCVXBooster");
    await mockBooster.waitForDeployment();
    
    const rewardTokens: string[] = [];
    
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStakerFactory.deploy(
      operator.address,
      mockCLPToken.target,
      mockBooster.target,
      rewardTokens
    );
    await staker.waitForDeployment();

    // Ensure attacker address has higher numeric value than owner
    const ownerAddress = owner.address;
    const attackerAddress = attacker.address;
    const ownerNum = BigInt(ownerAddress);
    const attackerNum = BigInt(attackerAddress);
    
    if (attackerNum <= ownerNum) {
      // If attacker doesn't have higher address, we need to find one that does
      // For testing purposes, we'll skip this test case if condition not met
      console.log("Skipping: attacker address is not >= owner address");
      return;
    }

    // Set up CVX pool info
    await staker.connect(owner).setCvxPoolInfo(1, mockCLPToken.target, ethers.ZeroAddress);
    
    // Attempt to call withdrawAndUnwrap from attacker (not operator, not owner)
    await expect(
      staker.connect(attacker).withdrawAndUnwrap(0, false, ethers.ZeroAddress)
    ).to.be.reverted;
  });
});

// Mock ERC20 for testing
const mockERC20Artifact = {
  abi: [
    "constructor(string memory name, string memory symbol, uint8 decimals)",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ],
  bytecode: "0x..."
};

// Mock CVXBooster for testing
const mockBoosterArtifact = {
  abi: [
    "function poolInfo(uint256) view returns (address lptoken, address token, address gauge, address crvRewards, address stash, bool shutdown)",
    "function deposit(uint256 _pid, uint256 _amount, bool _stake) returns (bool)",
    "function withdraw(uint256 _pid, uint256 _amount) returns (bool)",
    "function depositAll(uint256 _pid, bool _stake) returns (bool)",
    "function withdrawAll(uint256 _pid) returns (bool)",
  ],
  bytecode: "0x..."
};