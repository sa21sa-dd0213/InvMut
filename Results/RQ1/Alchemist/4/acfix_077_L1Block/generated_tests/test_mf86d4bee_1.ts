import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant test - constructor version", function () {
  it("should return '1.0.0' from version() after deployment", async function () {
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const versionString = await instance.version();
    expect(versionString).to.equal("1.0.0");
  });
});