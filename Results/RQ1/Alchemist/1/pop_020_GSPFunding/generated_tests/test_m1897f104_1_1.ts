import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - deadline check", function () {
  it("should revert when deadline is in the future on mutant (deadline <= block.timestamp)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock ERC20 tokens
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Set a deadline 1 hour in the future
    const futureDeadline = Math.floor(Date.now() / 1000) + 3600;

    // Try to call sellShares - it will fail because we don't have shares,
    // but the deadline check happens first, so we can test the revert reason
    await expect(
      instance.connect(addr1).sellShares(
        100,           // shareAmount
        addr2.address, // to
        0,             // baseMinAmount
        0,             // quoteMinAmount
        "0x",          // data
        futureDeadline // deadline in the future
      )
    ).to.be.revertedWith("GLP_NOT_ENOUGH"); // This should pass on original, but on mutant it would revert with "TIME_EXPIRED"
  });
});