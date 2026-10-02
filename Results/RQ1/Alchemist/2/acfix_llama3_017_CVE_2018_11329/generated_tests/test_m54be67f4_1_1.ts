import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m54be67f4 - DrugDealer access control", function () {
  it("should allow CEO to call DrugDealer and update address (kill mutant with inverted require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the initial CEO address is set correctly
    expect(await instance.ceoAddress()).to.equal("0x85abE8E3bed0d4891ba201Af1e212FE50bb65a26");

    // CEO (owner) calls DrugDealer - should succeed on original, revert on mutant
    await expect(
      instance.connect(owner).DrugDealer()
    ).to.not.be.reverted;

    // Verify that the CEO address was updated to the caller (owner)
    expect(await instance.ceoAddress()).to.equal(owner.address);
  });
});