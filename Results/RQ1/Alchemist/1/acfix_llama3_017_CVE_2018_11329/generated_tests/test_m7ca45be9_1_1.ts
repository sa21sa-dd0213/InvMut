import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m7ca45be9 - getFreeKilo without initialization check", function () {
  it("should revert when calling getFreeKilo before seedMarket is called, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify that the contract is NOT initialized yet
    const isInitialized = await instance.initialized();
    expect(isInitialized).to.be.false;

    // Try to call getFreeKilo before initialization - this should revert in the original
    // but the mutant removes the require(initialized) check, so it will succeed
    await expect(
      instance.connect(addr1).getFreeKilo()
    ).to.not.be.reverted;

    // Verify that the mutant allowed the operation by checking Kilos balance
    const kilos = await instance.getMyKilo();
    // The original would have reverted, but mutant assigns STARTING_KILOS (300)
    expect(kilos).to.equal(300);
  });
});