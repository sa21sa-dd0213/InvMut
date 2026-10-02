import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mbf2eadbf test", function () {
  it("should revert when vs array is empty but tos array is not empty", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const vs: string[] = [];

    // Original contract reverts due to require(vs.length > 0)
    // Mutant without this check would not revert, so test expects revert to kill mutant
    await expect(
      instance.transfer(await instance.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});