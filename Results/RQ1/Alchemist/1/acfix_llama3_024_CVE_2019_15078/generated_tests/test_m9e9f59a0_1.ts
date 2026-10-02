import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m9e9f59a0: verify recipient balance increases on transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const initialOwnerBalance = await instance.balanceOf(owner.address);
    const initialAddr1Balance = await instance.balanceOf(addr1.address);
    
    // Perform a transfer from owner to addr1
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Check that recipient balance increased (mutant would decrease it)
    const finalAddr1Balance = await instance.balanceOf(addr1.address);
    expect(finalAddr1Balance).to.equal(initialAddr1Balance + transferAmount);
    
    // Also verify sender balance decreased correctly
    const finalOwnerBalance = await instance.balanceOf(owner.address);
    expect(finalOwnerBalance).to.equal(initialOwnerBalance - transferAmount);
  });
});