import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m9125f35d test", function () {
  it("should kill mutant by calling transferFrom with valid parameters and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute some tokens to addr1 so they have a balance to transfer
    // Call getTokens from addr1 to get initial distribution
    await instance.connect(addr1).getTokens({ value: 0 });

    // Get the balance of addr1
    const balanceAddr1 = await instance.balanceOf(addr1.address);
    expect(balanceAddr1).to.be.gt(0);

    // Approve owner to spend tokens from addr1
    await instance.connect(addr1).approve(owner.address, balanceAddr1);

    // Now call transferFrom with valid parameters - this should succeed on original
    // but fail on mutant due to calldata size check with 3**32
    await expect(
      instance.connect(owner).transferFrom(addr1.address, addr2.address, balanceAddr1)
    ).to.not.be.reverted;

    // Verify the transfer happened correctly
    const finalBalanceAddr2 = await instance.balanceOf(addr2.address);
    expect(finalBalanceAddr2).to.equal(balanceAddr1);
  });
});