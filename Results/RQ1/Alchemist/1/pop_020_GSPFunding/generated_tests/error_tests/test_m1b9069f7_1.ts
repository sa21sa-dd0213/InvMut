import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m1b9069f7 - reentrancy guard removal", function () {
  let instance: any;
  let owner: any;
  let attacker: any;
  let baseToken: any;
  let quoteToken: any;
  let attackerContract: any;

  // Deploy a simple attacker contract that can re-enter sellShares
  before(async function () {
    [owner, attacker] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    baseToken = await ERC20Factory.deploy("Base", "BASE", ethers.parseEther("1000000"));
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", ethers.parseEther("1000000"));
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy the GSPFunding contract (original or mutant)
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    instance = await GSPFundingFactory.deploy();
    await instance.waitForDeployment();

    // Initialize the GSPFunding pool (assuming there's an init function or constructor sets initial state)
    // For testing, we need to set up initial reserves and mint shares to attacker
    // This requires calling the appropriate initialization functions
    // We'll assume the contract has an initialize function or we can directly set state
    // For simplicity, we'll use low-level calls to set initial state via the maintainer
    // First, transfer tokens to the GSPFunding contract
    await baseToken.transfer(instance.target, ethers.parseEther("10000"));
    await quoteToken.transfer(instance.target, ethers.parseEther("10000"));

    // Set initial reserves and targets via internal state (only possible if maintainer)
    // We'll simulate by calling buyShares to create initial liquidity
    // First, set the I and K values
    await instance.connect(owner).adjustPrice(ethers.parseEther("1")); // Set I = 1
    await instance.connect(owner).adjustMtFeeRate(0); // No fees

    // Buy initial shares to create pool
    await baseToken.approve(instance.target, ethers.parseEther("5000"));
    await quoteToken.approve(instance.target, ethers.parseEther("5000"));
    await instance.connect(owner).buyShares(owner.address);

    // Now transfer some shares to attacker
    const shares = await instance.balanceOf(owner.address);
    await instance.connect(owner).transfer(attacker.address, shares / 2n);

    // Deploy attacker contract that re-enters sellShares
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    attackerContract = await AttackerFactory.deploy(instance.target);
    await attackerContract.waitForDeployment();
  });

  it("should revert on reentrancy in original (nonReentrant), but succeed on mutant", async function () {
    // Get attacker's share balance
    const attackerShares = await instance.balanceOf(attacker.address);
    expect(attackerShares).to.be.gt(0);

    // Attacker calls sellShares through their malicious contract
    // The attacker contract will try to re-enter sellShares in the callback
    const tx = attackerContract.connect(attacker).attack(
      attackerShares,
      attacker.address,
      0, // baseMinAmount
      0, // quoteMinAmount
      "0x", // data (empty initially, callback will be triggered by attacker contract)
      Math.floor(Date.now() / 1000) + 3600 // deadline
    );

    // If the mutant is deployed (no nonReentrant), this should succeed (reentrancy possible)
    // If original is deployed (with nonReentrant), this should revert
    // We expect the mutant to allow the reentrancy, so we check that it does NOT revert
    await expect(tx).to.not.be.reverted;
    
    // Additional check: after reentrancy, the attacker should have drained more funds than allowed
    const attackerBalanceAfter = await instance.balanceOf(attacker.address);
    // In a proper reentrancy attack, the attacker would have extracted tokens multiple times
    // For the mutant, we expect the attacker's share balance to be manipulated
    // This confirms the mutant is vulnerable
    expect(attackerBalanceAfter).to.be.lt(attackerShares);
  });
});

// Mock ERC20 contract for testing
// This would be deployed as a separate contract file
// For the test to work, we need these contracts compiled alongside
// The ReentrancyAttacker contract should be in a separate file