import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET - kill mutant m37dee58a (balance==MinSum instead of >=)", function () {
  it("should revert when balance > MinSum and trying to collect MinSum (mutant fails)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(log.target);
    await instance.waitForDeployment();

    // MinSum is 1 ether by default
    const MinSum = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2"); // > MinSum

    // addr1 deposits 2 ether (balance > MinSum)
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Now addr1's balance is 2 ether, which is > MinSum
    // In original contract: acc.balance >= MinSum is true -> should succeed
    // In mutant: acc.balance == MinSum is false -> should revert
    await expect(
      instance.connect(addr1).Collect(MinSum)
    ).to.be.reverted;
  });
});