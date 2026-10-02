import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should set owner to the provided address when calling setOwner", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Only the admin (original deployer) can call setOwner
    await instance.connect(owner).setOwner(addr1.address);
    
    // Check that the owner was set to addr1, not address(0)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});