import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection test", function () {
  it("should detect mutant that sets owner to address(0) instead of the passed address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner with a non-zero address
    const newOwner = addr2.address;
    await instance.connect(owner).setOwner(newOwner);

    // Verify owner was set to the provided address, not address(0)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwner);
  });
});