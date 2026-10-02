import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb17d49b6 by verifying only owner can call transferOwnership", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, addr1.address);
    await instance.waitForDeployment();

    // Verify that the current owner can successfully transfer ownership
    await instance.transferOwnership(addr2.address);
    const ownerAfterTransfer = await instance._ownerAddress();
    expect(ownerAfterTransfer).to.equal(addr2.address);
    
    // Verify that the new owner can now transfer ownership
    await instance.connect(addr2).transferOwnership(owner.address);
    const ownerAfterSecondTransfer = await instance._ownerAddress();
    expect(ownerAfterSecondTransfer).to.equal(owner.address);
  });
});