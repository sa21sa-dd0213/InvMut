import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m8c9d18ff test", function () {
  it("should revert when collecting amount less than MinSum (original behavior), but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Deposit 0.5 ether (less than MinSum which is 1 ether)
    const depositAmount = ethers.parseEther("0.5");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Attempt to collect the deposited amount
    // Original contract would revert because 0.5 < 1 (fails acc.balance >= MinSum)
    // Mutant would allow because 0.5 <= 1 (passes acc.balance <= MinSum)
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});