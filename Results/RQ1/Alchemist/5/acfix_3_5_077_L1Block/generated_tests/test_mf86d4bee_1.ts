import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - constructor version initialization", function () {
  it("should return correct version string after proper constructor initialization", async function () {
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const version = await instance.version();
    expect(version).to.equal("1.0.0");
  });
});