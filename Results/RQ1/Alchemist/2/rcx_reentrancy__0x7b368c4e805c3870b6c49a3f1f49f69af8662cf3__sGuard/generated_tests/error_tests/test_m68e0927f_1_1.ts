import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m68e0927f test", function () {
  it("should revert when balance >= MinSum but balance < _am and time < unlockTime (original should revert, mutant should not)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Set MinSum to 1 ether (default)
    const minSum = ethers.parseEther("1");

    // addr1 sends 1 ether (equals MinSum) with unlock time far in the future
    const futureTime = Math.floor(Date.now() / 1000) + 100000;
    await instance.connect(addr1).Put(futureTime, { value: ethers.parseEther("1") });

    // Now try to collect 2 ether (balance is 1, less than _am) before unlock time
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("2"))
    ).to.be.reverted; // Original contract reverts; mutant would NOT revert
  });
});