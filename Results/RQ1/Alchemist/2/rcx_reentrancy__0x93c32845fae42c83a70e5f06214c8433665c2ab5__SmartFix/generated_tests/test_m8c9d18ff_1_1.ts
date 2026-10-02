import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m8c9d18ff detection", function () {
  it("should revert when trying to collect an amount less than MinSum (1 ether) with balance below MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Deposit 0.5 ether (less than MinSum of 1 ether)
    const depositAmount = ethers.parseEther("0.5");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Attempt to collect 0.5 ether - should revert in original (balance < MinSum)
    // but would succeed in mutant (balance <= MinSum)
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});