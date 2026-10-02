import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when distributeTokenPeriodic is called before initTime has passed (mutant m875e8288)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const liquidityReceiveAddress = addr1.address;

    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Immediately call distributeTokenPeriodic after deployment
    // initTime is 0, nowTime > 0, so nowTime > initTime should be false
    // Original contract should revert, mutant should not
    await expect(
      instance.distributeTokenPeriodic()
    ).to.be.revertedWith("Not within the execution time range");
  });
});