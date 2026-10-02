import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test", function () {
  it("should revert when tos and vs arrays have different lengths", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create arrays of different lengths
    const tos = [addr1.address, addr2.address]; // 2 addresses
    const vs = [ethers.parseEther("1")]; // 1 value

    // This should revert because lengths don't match (original requires tos.length == vs.length)
    await expect(
      instance.transfer(owner.address, tos, vs)
    ).to.be.reverted;
  });
});