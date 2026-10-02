import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant mdb213035 - devFee return statement", function () {
  it("should return non-zero fee when calling devFee with a non-zero amount", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const testAmount = ethers.parseEther("10");
    const fee = await instance.devFee(testAmount);

    // The original contract returns 4% of the amount (non-zero)
    // The mutant returns 0 because the return statement is missing
    expect(fee).to.be.gt(0);
  });
});