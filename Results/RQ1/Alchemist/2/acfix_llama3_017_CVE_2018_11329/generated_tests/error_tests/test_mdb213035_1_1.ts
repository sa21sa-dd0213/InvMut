import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test", function () {
  it("should detect missing return in devFee function", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const testAmount = ethers.parseEther("10");
    const expectedFee = testAmount * 4n / 100n;
    const actualFee = await instance.devFee(testAmount);
    
    expect(actualFee).to.equal(expectedFee);
  });
});