import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending incorrect amount (mutant kills the require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with 5 wei instead of the required 10 wei
    await expect(
      instance.connect(addr1).play({ value: 5 })
    ).to.be.reverted;

    // Attempt to play with 20 wei instead of the required 10 wei
    await expect(
      instance.connect(addr1).play({ value: 20 })
    ).to.be.reverted;
  });
});