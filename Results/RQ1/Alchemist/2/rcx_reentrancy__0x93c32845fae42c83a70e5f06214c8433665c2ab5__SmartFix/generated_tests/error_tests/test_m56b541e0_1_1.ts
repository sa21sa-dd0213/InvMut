import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m56b541e0 test", function () {
  it("should kill mutant by sending 0 wei to Put function", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get initial balance for the owner
    const initialBalance = await instance.Acc(owner.address);
    const initialAccBalance = initialBalance.balance;

    // Send 0 wei to Put function - this should pass on original but revert on mutant
    await expect(
      instance.connect(owner).Put(0, { value: 0 })
    ).to.be.reverted;
  });
});