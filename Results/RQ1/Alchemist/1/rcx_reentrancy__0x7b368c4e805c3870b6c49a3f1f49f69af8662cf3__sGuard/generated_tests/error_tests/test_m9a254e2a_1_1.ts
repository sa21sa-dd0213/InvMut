import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test", function () {
  it("should revert when Collect is called with insufficient balance (kills mutant m9a254e2a)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Ensure MinSum is 1 ether (default)

    // addr1 has zero balance and no previous deposits
    // Attempt to Collect any positive amount (e.g., 0.5 ether)
    // This should revert in original due to acc.balance >= MinSum failing
    // The mutant with condition replaced by true would allow the call to proceed

    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;

    // Additional verification: also test with insufficient amount relative to balance
    // First deposit some ETH to addr1's account
    await instance.connect(addr1).Put(
      Math.floor(Date.now() / 1000) + 1000, // future unlock time
      { value: ethers.parseEther("2") }
    );

    // Now try to Collect more than deposited (should also revert in original)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("3"))
    ).to.be.reverted;

    // Test with amount less than MinSum but before unlock time
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted; // should revert because unlock time not reached

    // The mutant would pass all these without revert, thus the test kills it
  });
});