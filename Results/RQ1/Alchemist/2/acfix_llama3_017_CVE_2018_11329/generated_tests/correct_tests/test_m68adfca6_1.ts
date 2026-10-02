import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant test - ceoAddress changed to address(this)", function () {
  it("should revert when non-contract address calls DrugDealer() since ceoAddress is now the contract itself", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the mutant, ceoAddress is set to address(this) (the contract itself)
    // Calling DrugDealer() from any EOA (like addr1) should revert because msg.sender != address(this)
    await expect(
      instance.connect(addr1).DrugDealer()
    ).to.be.revertedWith("Only CEO can set new address");
  });
});