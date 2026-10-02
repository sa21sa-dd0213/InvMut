import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when owner calls setOwner (mutant removal of return true should fail)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls setOwner with a new address - original returns true, mutant returns false
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Get the return value from the transaction (ethers v6 captures it via tx)
    const result = await instance.connect(owner).setOwner.staticCall(addr1.address);

    // The original contract returns true, the mutant (without return true) will return false
    expect(result).to.equal(true);
  });
});