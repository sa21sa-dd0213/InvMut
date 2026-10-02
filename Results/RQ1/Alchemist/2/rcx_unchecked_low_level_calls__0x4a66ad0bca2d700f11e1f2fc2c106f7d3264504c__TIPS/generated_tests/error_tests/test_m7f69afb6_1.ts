import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant m7f69afb6 test", function () {
  it("should revert when unauthorized address calls transfer", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [unauthorized.address];
    const values = [1];
    
    await expect(
      instance.connect(unauthorized).transfer(tos, values)
    ).to.be.reverted;
  });
});