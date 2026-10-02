import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when tos and vs arrays have different lengths (kills mutant that removes length check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address, addr2.address, owner.address];
    const vs = [ethers.parseEther("1"), ethers.parseEther("2")];

    await expect(
      instance.transfer(await instance.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});