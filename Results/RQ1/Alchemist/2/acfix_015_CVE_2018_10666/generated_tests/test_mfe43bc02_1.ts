import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when owner calls setOwner (kill mutant mfe43bc02)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls setOwner and expects true return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // Check the return value from the transaction response
    const result = await instance.connect(owner).callStatic.setOwner(addr1.address);
    expect(result).to.equal(true);
  });
});