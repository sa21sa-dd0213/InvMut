import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m1b9069f7 - reentrancy guard removal", function () {
  let instance: any;
  let owner: any;
  let attacker: any;
  let baseToken: any;
  let quoteToken: any;
  let attackerContract: any;

  before(async function () {
    [owner, attacker] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    baseToken = await ERC20Factory.deploy("Base", "BASE", ethers.parseEther("1000000"));
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", ethers.parseEther("1000000"));
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy the GSPFunding contract
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    instance = await GSPFundingFactory.deploy();
    await instance.waitForDeployment();

    // Transfer tokens to the GSPFunding contract
    await baseToken.transfer(instance.target, ethers.parseEther("10000"));
    await quoteToken.transfer(instance.target, ethers.parseEther("10000"));

    // Set initial parameters
    await instance.connect(owner).adjustPrice(ethers.parseEther("1"));
    await instance.connect(owner).adjustMtFeeRate(0);

    // Approve and buy shares to create pool
    await baseToken.connect(owner).approve(instance.target, ethers.parseEther("5000"));
    await quoteToken.connect(owner).approve(instance.target, ethers.parseEther("5000"));
    await instance.connect(owner).buyShares(owner.address);

    // Transfer some shares to attacker
    const shares = await instance.balanceOf(owner.address);
    await instance.connect(owner).transfer(attacker.address, shares / 2n);

    // Deploy attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    attackerContract = await AttackerFactory.deploy(instance.target);
    await attackerContract.waitForDeployment();
  });

  it("should revert on reentrancy in original (nonReentrant), but succeed on mutant", async function () {
    // Get attacker's share balance
    const attackerShares = await instance.balanceOf(attacker.address);
    expect(attackerShares).to.be.gt(0);

    // Attacker calls sellShares through their malicious contract
    const tx = attackerContract.connect(attacker).attack(
      attackerShares,
      attacker.address,
      0, // baseMinAmount
      0, // quoteMinAmount
      "0x", // data
      Math.floor(Date.now() / 1000) + 3600 // deadline
    );

    // Expect the transaction to succeed (mutant allows reentrancy)
    await expect(tx).to.not.be.reverted;

    // Check that attacker's share balance was manipulated (reentrancy occurred)
    const attackerBalanceAfter = await instance.balanceOf(attacker.address);
    expect(attackerBalanceAfter).to.be.lt(attackerShares);
  });
});