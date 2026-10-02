import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m9e21efb0 test", function () {
  it("should detect mutant that sets owner to address(0) instead of _owner", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // The original contract would set owner to owner.address
    // The mutant sets owner to address(0)
    const contractOwner = await instance.owner();
    expect(contractOwner).to.equal(owner.address);
  });
});