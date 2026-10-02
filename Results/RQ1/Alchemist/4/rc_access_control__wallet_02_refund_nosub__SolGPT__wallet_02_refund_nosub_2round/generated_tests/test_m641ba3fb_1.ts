import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-creator calls migrateTo (kills mutant m641ba3fb)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the creator, so original contract would revert
    await expect(
      instance.connect(addr1).migrateTo(addr1.address)
    ).to.be.reverted;
  });
});