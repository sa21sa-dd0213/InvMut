import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant that always sets owner to address(0) instead of _newOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    // Deploy Owned - note: the contract has no constructor, so no constructor arguments needed
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial owner should be address(0) by default
    expect(await instance.owner()).to.equal(ethers.ZeroAddress);

    // Transfer ownership to a valid non-zero address
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // The mutant always sets owner to address(0), so this assertion will fail
    // on the mutant (owner will be address(0) instead of addr1.address)
    expect(await instance.owner()).to.equal(addr1.address);
  });
});