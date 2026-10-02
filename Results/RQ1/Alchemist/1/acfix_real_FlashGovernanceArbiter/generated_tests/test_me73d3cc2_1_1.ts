import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FlashGovernanceArbiter mutant me73d3cc2 detection", function () {
  it("should detect the inverted unlockTime comparison in withdrawGovernanceAsset", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock DAO
    const DAOMock = await ethers.getContractFactory("DAOMock");
    const dao = await DAOMock.deploy();
    await dao.waitForDeployment();

    // Deploy FlashGovernanceArbiter with the mock DAO
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(dao.target);
    await arbiter.waitForDeployment();

    // Deploy a simple ERC20 token for testing
    const TestToken = await ethers.getContractFactory("TestERC20");
    const token = await TestToken.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Mint tokens to user
    await token.mint(user.address, ethers.parseEther("100"));

    // Configure flash governance
    const amount = ethers.parseEther("10");
    const unlockTime = 3600; // 1 hour in seconds
    await arbiter.configureFlashGovernance(token.target, amount, unlockTime, false);

    // Approve tokens for the arbiter
    await token.connect(user).approve(arbiter.target, amount);

    // Make user a governed address
    await arbiter.setGoverned([user.address], [true]);

    // Set security parameters to allow immediate flash governance
    await arbiter.configureSecurityParameters(0, 0, 0);

    // Call assertGovernanceApproved to create a pending decision
    await arbiter.connect(user).assertGovernanceApproved(user.address, arbiter.target, true);

    // Wait until unlock time has passed
    await time.increase(unlockTime + 100);

    // Try to withdraw - should succeed because unlockTime < block.timestamp
    await expect(
      arbiter.connect(user).withdrawGovernanceAsset(arbiter.target, token.target)
    ).to.not.be.reverted;
  });
});