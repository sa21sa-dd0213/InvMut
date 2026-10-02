import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m4688b193 - transferFrom address validation", function () {
  it("should revert when _to is address(0) in original, but mutant incorrectly allows transfer to zero address and reverts for valid addresses", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, approve addr1 to spend owner's tokens
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(addr1.address, approveAmount);
    
    // Transfer some tokens from owner to addr1 first so addr1 has tokens to transferFrom
    const transferAmount = ethers.parseEther("50");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Now addr1 approves owner to spend their tokens
    await instance.connect(addr1).approve(owner.address, transferAmount);
    
    // The mutant requires _to == address(0), so a transfer to a valid address (addr2) should revert
    // In the original, this should succeed
    await expect(
      instance.connect(owner).transferFrom(addr1.address, addr2.address, transferAmount)
    ).to.be.reverted;
  });
});