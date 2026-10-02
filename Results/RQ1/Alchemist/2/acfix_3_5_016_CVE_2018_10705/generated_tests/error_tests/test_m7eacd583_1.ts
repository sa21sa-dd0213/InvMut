import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when setOwner is called by admin", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner from the admin (which is the deployer/owner)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // The return value should be true for the original contract
    // The mutant removes the return statement, so this will detect the difference
    expect(await instance.connect(owner).callStatic.setOwner(addr1.address)).to.be.true;
  });
});