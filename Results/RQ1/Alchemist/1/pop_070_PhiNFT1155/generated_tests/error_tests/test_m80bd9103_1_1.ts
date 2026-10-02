import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return version 1 (kill mutant m80bd9103)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const version = await instance.version();
    expect(version).to.equal(1n);
  });
});