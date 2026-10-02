import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant test - meb1be3f2", function () {
  it("should detect that ceoAddress is zero address and DrugDealer cannot be called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify that ceoAddress is address(0) due to the mutation
    const ceoAddress = await instance.ceoAddress();
    expect(ceoAddress).to.equal(ethers.ZeroAddress);

    // Attempt to call DrugDealer from any address - should revert because msg.sender != ceoAddress (which is zero)
    await expect(
      instance.connect(addr1).DrugDealer()
    ).to.be.revertedWith("Only CEO can set new address");
  });
});