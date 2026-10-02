import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m56b541e0 test", function () {
  it("should revert when Put is called with zero msg.value (kills mutant that uses > instead of >=)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Call Put with 0 ether - this should revert in the mutant (because 0 > 0 is false)
    // but should succeed in the original (because 0 >= 0 is true)
    await expect(
      instance.connect(owner).Put(0, { value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});