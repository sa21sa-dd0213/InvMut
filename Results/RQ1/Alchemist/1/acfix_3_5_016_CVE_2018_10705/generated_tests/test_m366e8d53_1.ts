import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection - m366e8d53", function () {
  it("should detect mutant that always sets owner to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with a non-zero address
    const newOwner = addr1.address;
    await instance.connect(owner).setOwner(newOwner);

    // The original contract would set owner to newOwner.
    // The mutant sets owner to address(0) regardless.
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwner);
  });
});