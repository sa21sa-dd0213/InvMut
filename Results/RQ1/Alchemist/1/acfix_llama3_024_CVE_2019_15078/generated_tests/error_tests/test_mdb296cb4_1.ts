import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mdb296cb4 test", function () {
  it("should return true when transfer succeeds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner has initial balance from constructor, send some tokens to addr1
    const transferAmount = ethers.parseEther("100");
    const tx = await instance.transfer(addr1.address, transferAmount);
    const receipt = await tx.wait();

    // The transfer function should return true on success
    // We can check the return value by calling the function statically
    const returnValue = await instance.transfer.staticCall(addr1.address, transferAmount);
    expect(returnValue).to.equal(true);
  });
});