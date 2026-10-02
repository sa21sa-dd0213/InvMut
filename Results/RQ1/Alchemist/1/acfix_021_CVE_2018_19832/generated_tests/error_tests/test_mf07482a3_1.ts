import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant that removes return value from transfer function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute some tokens to owner to enable transfers
    await instance.NETM();
    
    // Get the initial balance of owner and addr1
    const initialOwnerBalance = await instance.balanceOf(owner.address);
    const initialAddr1Balance = await instance.balanceOf(addr1.address);
    
    // Transfer some tokens from owner to addr1
    const transferAmount = ethers.parseEther("100");
    const tx = await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // The mutated function should return false or undefined instead of true
    // We expect the transaction to not revert but the return value should be falsy
    const receipt = await tx.wait();
    
    // Check the return value of the transfer call - this should fail on the mutant
    // because the mutant doesn't return true, it returns nothing (undefined)
    const returnValue = await instance.connect(owner).transfer.staticCall(addr1.address, transferAmount);
    expect(returnValue).to.equal(true);
  });
});