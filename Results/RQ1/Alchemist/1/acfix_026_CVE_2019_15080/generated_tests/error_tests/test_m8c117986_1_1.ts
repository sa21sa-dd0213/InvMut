import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection - m8c117986", function () {
  it("should detect mutation that sets owner to address(0) instead of _newOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call transferOwnership with a non-zero address
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Verify owner was set to addr1, not address(0)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});