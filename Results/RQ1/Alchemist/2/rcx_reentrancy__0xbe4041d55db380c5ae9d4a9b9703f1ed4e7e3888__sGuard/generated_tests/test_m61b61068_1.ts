import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m61b61068 detection test", function () {
  it("should revert SetLogFile after Initialized is called (detects missing revert in mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call Initialized() to set the flag to true
    const txInit = await instance.Initialized();
    await txInit.wait();

    // Now call SetLogFile - original reverts, mutant does not
    await expect(
      instance.SetLogFile(owner.address)
    ).to.be.reverted;
  });
});