import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant mf86d4bee test", function () {
  it("should detect mutant by checking version() return value after deployment", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const version = await instance.version();
    expect(version).to.equal("1.0.0");
  });
});