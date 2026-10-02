import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mcf8febf1 test", function () {
  it("should revert when transferFrom is called with amount exceeding _from balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute tokens to addr1 so they have a balance
    await instance.connect(owner).getTokens();
    // Transfer some tokens from owner to addr1 for testing
    await instance.connect(owner).transfer(addr1.address, ethers.parseEther("100"));

    // Approve addr2 to spend tokens on behalf of addr1
    await instance.connect(addr1).approve(addr2.address, ethers.parseEther("50"));

    // Attempt to transfer more than addr1's balance from addr1 to addr2
    // addr1 has 100 tokens, but we try to transfer 200
    await expect(
      instance.connect(addr2).transferFrom(
        addr1.address,
        addr2.address,
        ethers.parseEther("200")
      )
    ).to.be.reverted;
  });
});