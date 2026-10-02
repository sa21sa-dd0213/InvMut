import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant maf8a1472 - transferFrom return value", function () {
  it("should return true on successful transferFrom and kill mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr1 to spend 1000 tokens from owner
    const approveAmount = ethers.parseEther("1000");
    await instance.connect(owner).approve(addr1.address, approveAmount);

    // Have addr1 transfer tokens from owner to addr2
    const transferAmount = ethers.parseEther("500");
    const tx = await instance.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
    const receipt = await tx.wait();

    // The critical assertion: check that transferFrom returns true
    // In ethers v6, the return value is accessible from the transaction response
    expect(tx).to.not.be.undefined;

    // Verify the transfer actually happened by checking balances
    const ownerBalance = await instance.balanceOf(owner.address);
    const addr2Balance = await instance.balanceOf(addr2.address);

    expect(ownerBalance).to.equal(ethers.parseEther("199999999500")); // initial totalDistributed - 500
    expect(addr2Balance).to.equal(transferAmount);

    // Use staticCall to check the return value of transferFrom
    // Note: This calls the function without state changes to get the return value
    const success = await instance.connect(addr1).transferFrom.staticCall(owner.address, addr2.address, ethers.parseEther("0"));
    expect(success).to.be.true;

    // Verify the Transfer event was emitted
    const transferEvent = receipt?.logs.find(log => 
      log.topics[0] === ethers.id("Transfer(address,address,uint256)")
    );
    expect(transferEvent).to.not.be.undefined;
  });
});