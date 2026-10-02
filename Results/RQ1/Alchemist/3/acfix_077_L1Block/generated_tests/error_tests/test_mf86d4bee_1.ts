import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant test - constructor version initialization", function () {
  it("should return version 1.0.0 after deployment", async function () {
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const version = await instance.version();
    expect(version).to.equal("1.0.0");
  });
});